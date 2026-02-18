import type { Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '../types/socket';
import api from './api';
import { getSocket } from './socket';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function debugLog(msg: string) {
  console.log(`[WebRTC] ${msg}`);
  const s = getSocket();
  if (s?.connected) s.emit('voice:debug', msg);
}

const peerConnections = new Map<string, RTCPeerConnection>();
const remoteStreams = new Map<string, MediaStream>();
const pendingCandidates = new Map<string, RTCIceCandidateInit[]>();

const FALLBACK_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

let cachedRtcConfig: RTCConfiguration | null = null;

export async function fetchIceConfig(): Promise<RTCConfiguration> {
  if (cachedRtcConfig) return cachedRtcConfig;
  try {
    const { data } = await api.get('/config/ice');
    cachedRtcConfig = { iceServers: data.iceServers };
    return cachedRtcConfig;
  } catch {
    console.warn('[WebRTC] Failed to fetch ICE config, using STUN fallback');
    return FALLBACK_CONFIG;
  }
}

let onRemoteStream: ((userId: string, stream: MediaStream) => void) | null = null;
let onPeerDisconnected: ((userId: string) => void) | null = null;

export function setCallbacks(callbacks: {
  onRemoteStream: (userId: string, stream: MediaStream) => void;
  onPeerDisconnected: (userId: string) => void;
}) {
  onRemoteStream = callbacks.onRemoteStream;
  onPeerDisconnected = callbacks.onPeerDisconnected;
}

export function createPeerConnection(
  userId: string,
  localStream: MediaStream,
  socket: TypedSocket,
  rtcConfig?: RTCConfiguration,
): RTCPeerConnection {
  console.log(`[WebRTC] Creating peer connection to ${userId.slice(0, 8)}`);

  // Close existing connection if any
  const existing = peerConnections.get(userId);
  if (existing) {
    console.log(`[WebRTC] Closing existing connection to ${userId.slice(0, 8)}`);
    existing.close();
  }

  // Clear any stale buffered candidates
  pendingCandidates.delete(userId);

  const pc = new RTCPeerConnection(rtcConfig || cachedRtcConfig || FALLBACK_CONFIG);
  peerConnections.set(userId, pc);

  // Add local tracks
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // Handle remote tracks
  pc.ontrack = (event) => {
    console.log(`[WebRTC] Got remote track from ${userId.slice(0, 8)}`);
    const stream = event.streams[0];
    if (stream) {
      remoteStreams.set(userId, stream);
      onRemoteStream?.(userId, stream);
    }
  };

  // Handle ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('voice:ice-candidate', { to: userId, candidate: event.candidate.toJSON() });
    }
  };

  pc.oniceconnectionstatechange = () => {
    debugLog(`ICE state for ${userId.slice(0, 8)}: ${pc.iceConnectionState}`);
  };

  pc.onicegatheringstatechange = () => {
    debugLog(`ICE gathering for ${userId.slice(0, 8)}: ${pc.iceGatheringState}`);
  };

  pc.onconnectionstatechange = () => {
    debugLog(`Connection state for ${userId.slice(0, 8)}: ${pc.connectionState}`);
    // Only close on 'failed' — 'disconnected' is often temporary and can recover
    if (pc.connectionState === 'failed') {
      closePeerConnection(userId);
      onPeerDisconnected?.(userId);
    }
  };

  return pc;
}

export async function createOffer(userId: string, socket: TypedSocket) {
  const pc = peerConnections.get(userId);
  if (!pc) return;

  console.log(`[WebRTC] Creating offer for ${userId.slice(0, 8)}`);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit('voice:offer', { to: userId, offer: pc.localDescription! });
}

async function flushPendingCandidates(userId: string, pc: RTCPeerConnection) {
  const queued = pendingCandidates.get(userId);
  if (!queued || queued.length === 0) return;
  console.log(`[WebRTC] Flushing ${queued.length} buffered ICE candidates for ${userId.slice(0, 8)}`);
  for (const candidate of queued) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error(`[WebRTC] Failed to add buffered ICE candidate for ${userId.slice(0, 8)}:`, err);
    }
  }
  pendingCandidates.delete(userId);
}

export async function handleOffer(
  userId: string,
  offer: RTCSessionDescriptionInit,
  localStream: MediaStream,
  socket: TypedSocket,
) {
  console.log(`[WebRTC] Received offer from ${userId.slice(0, 8)}`);
  let pc = peerConnections.get(userId);
  if (!pc) {
    pc = createPeerConnection(userId, localStream, socket);
  }

  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  await flushPendingCandidates(userId, pc);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('voice:answer', { to: userId, answer: pc.localDescription! });
  console.log(`[WebRTC] Sent answer to ${userId.slice(0, 8)}`);
}

export async function handleAnswer(userId: string, answer: RTCSessionDescriptionInit) {
  const pc = peerConnections.get(userId);
  if (!pc) return;
  console.log(`[WebRTC] Received answer from ${userId.slice(0, 8)}`);
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
  await flushPendingCandidates(userId, pc);
}

export async function handleIceCandidate(userId: string, candidate: RTCIceCandidateInit) {
  const pc = peerConnections.get(userId);
  if (!pc) return;

  // Buffer candidates that arrive before remoteDescription is set
  if (!pc.remoteDescription) {
    if (!pendingCandidates.has(userId)) {
      pendingCandidates.set(userId, []);
    }
    pendingCandidates.get(userId)!.push(candidate);
    debugLog(`Buffered ICE candidate for ${userId.slice(0, 8)} (no remote desc yet, total: ${pendingCandidates.get(userId)!.length})`);
    return;
  }

  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    console.error(`[WebRTC] Failed to add ICE candidate for ${userId.slice(0, 8)}:`, err);
  }
}

export function closePeerConnection(userId: string) {
  const pc = peerConnections.get(userId);
  if (pc) {
    pc.close();
    peerConnections.delete(userId);
  }
  remoteStreams.delete(userId);
  pendingCandidates.delete(userId);
}

export function closeAllConnections() {
  peerConnections.forEach((pc) => pc.close());
  peerConnections.clear();
  remoteStreams.clear();
  pendingCandidates.clear();
}

export function getRemoteStream(userId: string): MediaStream | undefined {
  return remoteStreams.get(userId);
}
