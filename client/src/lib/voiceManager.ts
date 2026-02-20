import { getSocket, setOnReconnect } from './socket';
import { useVoiceStore } from '../stores/voiceStore';
import { useAuthStore } from '../stores/authStore';
import { useAudioStore } from '../stores/audioStore';
import {
  setCallbacks,
  createPeerConnection,
  createOffer,
  handleOffer,
  handleAnswer,
  handleIceCandidate,
  closePeerConnection,
  closeAllConnections,
  fetchIceConfig,
} from './webrtc';
import {
  initAudioEngine,
  addRemoteStream,
  removeRemoteStream,
  setMasterVolume,
  monitorLocalStream,
  setDeafened as setAudioDeafened,
  onVoiceActivity,
  destroyAudioEngine,
} from './audioEngine';

let localStream: MediaStream | null = null;
let listenersAttached = false;
let isJoining = false;

function getLocalStream(): MediaStream | null {
  return localStream;
}

export async function joinVoiceChannel(channelId: string) {
  // Prevent duplicate/concurrent joins
  if (isJoining) return;
  if (useVoiceStore.getState().channelId === channelId) return;

  isJoining = true;

  const socket = getSocket();
  if (!socket) { isJoining = false; return; }

  const userId = useAuthStore.getState().user?.id;
  const username = useAuthStore.getState().user?.username;
  if (!userId) { isJoining = false; return; }

  console.log('[Voice] Joining channel', channelId.slice(0, 8));

  // Leave existing voice channel first (internal — doesn't clear isJoining)
  leaveVoiceChannelInternal();

  initAudioEngine();

  // Update UI immediately
  useVoiceStore.getState().setChannel(channelId);
  useVoiceStore.getState().addParticipant({ userId, username: username || 'You' });

  // Set up a promise for participants (register listener BEFORE emitting join)
  const participantsPromise = new Promise<{ userId: string; username: string }[]>((resolve) => {
    socket.once('voice:participants', ({ participants }) => {
      console.log('[Voice] Got participants from server:', participants.map(p => p.username));
      useVoiceStore.getState().setParticipants(participants);
      resolve(participants);
    });
  });

  // Join on the server (triggers voice:participants response)
  socket.emit('voice:join', channelId);

  // Get microphone using selected device
  const audioPrefs = useAudioStore.getState();
  const audioConstraints: MediaTrackConstraints | boolean = audioPrefs.inputDeviceId
    ? { deviceId: { exact: audioPrefs.inputDeviceId } }
    : true;

  try {
    console.log('[Voice] Requesting microphone...');
    localStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
    console.log('[Voice] Got microphone stream, tracks:', localStream.getAudioTracks().length);
  } catch (err) {
    console.error('[Voice] Failed to get microphone:', err);
    useVoiceStore.getState().setChannel(null);
    isJoining = false;
    return;
  }

  // Apply master volume to audio engine
  setMasterVolume(audioPrefs.masterVolume);

  // Monitor local mic for voice activity (so we see our own green border)
  monitorLocalStream(userId, localStream);

  // Wait for participants (may have already resolved while getting mic)
  const participants = await participantsPromise;

  // Fetch ICE config (TURN credentials) before creating connections
  const rtcConfig = await fetchIceConfig();

  // Create peer connections to existing users (we send offers, they respond with answers)
  const otherParticipants = participants.filter(p => p.userId !== userId);
  console.log(`[Voice] Creating peer connections to ${otherParticipants.length} existing user(s)`);
  for (const participant of otherParticipants) {
    console.log(`[Voice] Connecting to ${participant.username} (${participant.userId.slice(0, 8)})`);
    createPeerConnection(participant.userId, localStream!, socket, rtcConfig);
    await createOffer(participant.userId, socket);
  }

  // Register reconnection handler — if socket drops and reconnects,
  // re-join the voice room and re-establish peer connections
  setOnReconnect(() => {
    const currentChannel = useVoiceStore.getState().channelId;
    if (!currentChannel || !localStream) return;

    console.log('[Voice] Socket reconnected — re-joining voice channel');
    const sock = getSocket();
    if (!sock) return;

    // Re-join on the server (puts us back in the voice room)
    sock.emit('voice:join', currentChannel);

    // Wait for participants, then re-create peer connections
    sock.once('voice:participants', async ({ participants }) => {
      console.log('[Voice] Re-establishing connections to', participants.map(p => p.username));
      useVoiceStore.getState().setParticipants(participants);

      const myId = useAuthStore.getState().user?.id;
      for (const p of participants) {
        if (p.userId === myId) continue;
        createPeerConnection(p.userId, localStream!, sock);
        await createOffer(p.userId, sock);
      }
    });
  });

  isJoining = false;
  console.log('[Voice] Join complete');
}

// Internal leave — used by joinVoiceChannel, does NOT reset isJoining
function leaveVoiceChannelInternal() {
  setOnReconnect(null);

  try {
    const socket = getSocket();
    if (useVoiceStore.getState().channelId) {
      socket?.emit('voice:leave');
    }

    closeAllConnections();
    destroyAudioEngine();

    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    }
  } catch (err) {
    console.error('[Voice] Error during leave cleanup:', err);
  }

  // Always clear channel state, even if cleanup above threw
  useVoiceStore.getState().setChannel(null);
}

// Public leave — called by UI disconnect button
export function leaveVoiceChannel() {
  isJoining = false;
  leaveVoiceChannelInternal();
}

export function toggleMute() {
  const store = useVoiceStore.getState();
  const newMuted = !store.isMuted;
  store.setMuted(newMuted);
  if (localStream) {
    localStream.getAudioTracks().forEach((t) => { t.enabled = !newMuted; });
  }
}

export function toggleDeafen() {
  const store = useVoiceStore.getState();
  const newDeafened = !store.isDeafened;
  store.setDeafened(newDeafened);
  setAudioDeafened(newDeafened);
  if (newDeafened && localStream) {
    localStream.getAudioTracks().forEach((t) => { t.enabled = false; });
  }
}

export function setupVoiceListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  // WebRTC callbacks
  setCallbacks({
    onRemoteStream: (peerId, stream) => {
      addRemoteStream(peerId, stream);
    },
    onPeerDisconnected: (peerId) => {
      removeRemoteStream(peerId);
      useVoiceStore.getState().removeParticipant(peerId);
    },
  });

  onVoiceActivity((peerId, speaking) => {
    useVoiceStore.getState().setSpeaking(peerId, speaking);
  });

  const socket = getSocket();
  if (!socket) return;

  socket.on('voice:offer', async (data) => {
    console.log(`[Voice] Received offer from ${data.from.slice(0, 8)}`);
    const stream = getLocalStream();
    if (!stream) {
      console.warn('[Voice] No local stream available to handle offer — ignoring');
      return;
    }
    await handleOffer(data.from, data.offer, stream, socket);
  });

  socket.on('voice:answer', async (data) => {
    console.log(`[Voice] Received answer from ${data.from.slice(0, 8)}`);
    await handleAnswer(data.from, data.answer);
  });

  socket.on('voice:ice-candidate', async (data) => {
    await handleIceCandidate(data.from, data.candidate);
  });

  socket.on('voice:user-joined', (data) => {
    const currentUserId = useAuthStore.getState().user?.id;
    if (data.userId === currentUserId) return;
    // The new user will send us an offer via their joinVoiceChannel flow.
    // UI tracking is handled by useSocket's voice:user-joined listener.
  });

  socket.on('voice:user-left', (data) => {
    closePeerConnection(data.userId);
    removeRemoteStream(data.userId);
    useVoiceStore.getState().removeParticipant(data.userId);
  });
}

export function teardownVoiceListeners() {
  listenersAttached = false;
  const socket = getSocket();
  if (!socket) return;
  socket.off('voice:offer');
  socket.off('voice:answer');
  socket.off('voice:ice-candidate');
  socket.off('voice:user-joined');
  socket.off('voice:user-left');
}
