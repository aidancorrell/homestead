import { useCallback, useEffect, useRef } from 'react';
import { getSocket } from '../lib/socket';
import { useVoiceStore } from '../stores/voiceStore';
import { useAuthStore } from '../stores/authStore';
import { useMediaStream } from './useMediaStream';
import {
  setCallbacks,
  createPeerConnection,
  createOffer,
  handleOffer,
  handleAnswer,
  handleIceCandidate,
  closePeerConnection,
  closeAllConnections,
} from '../lib/webrtc';
import {
  initAudioEngine,
  addRemoteStream,
  removeRemoteStream,
  setDeafened as setAudioDeafened,
  onVoiceActivity,
  destroyAudioEngine,
} from '../lib/audioEngine';

export function useVoice() {
  const { stream, getStream, stopStream, setMuted: setStreamMuted } = useMediaStream();
  const voiceStore = useVoiceStore();
  const userId = useAuthStore((s) => s.user?.id);
  const streamRef = useRef<MediaStream | null>(null);

  // Keep streamRef in sync
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  // Set up WebRTC callbacks
  useEffect(() => {
    setCallbacks({
      onRemoteStream: (peerId, remoteStream) => {
        addRemoteStream(peerId, remoteStream);
      },
      onPeerDisconnected: (peerId) => {
        removeRemoteStream(peerId);
        voiceStore.removeParticipant(peerId);
      },
    });

    onVoiceActivity((peerId, speaking) => {
      voiceStore.setSpeaking(peerId, speaking);
    });
  }, []);

  // Listen for signaling events
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleOfferEvent = async (data: { from: string; offer: RTCSessionDescriptionInit }) => {
      if (!streamRef.current) return;
      await handleOffer(data.from, data.offer, streamRef.current, socket);
    };

    const handleAnswerEvent = async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
      await handleAnswer(data.from, data.answer);
    };

    const handleIceCandidateEvent = async (data: { from: string; candidate: RTCIceCandidateInit }) => {
      await handleIceCandidate(data.from, data.candidate);
    };

    const handleUserJoined = async (data: { userId: string; username: string; channelId: string }) => {
      if (data.userId === userId || !streamRef.current) return;
      const socket = getSocket();
      if (!socket) return;

      // Create peer connection and send offer to new user
      createPeerConnection(data.userId, streamRef.current, socket);
      await createOffer(data.userId, socket);
    };

    const handleUserLeft = (data: { userId: string }) => {
      closePeerConnection(data.userId);
      removeRemoteStream(data.userId);
    };

    socket.on('voice:offer', handleOfferEvent);
    socket.on('voice:answer', handleAnswerEvent);
    socket.on('voice:ice-candidate', handleIceCandidateEvent);
    socket.on('voice:user-joined', handleUserJoined);
    socket.on('voice:user-left', handleUserLeft);

    return () => {
      socket.off('voice:offer', handleOfferEvent);
      socket.off('voice:answer', handleAnswerEvent);
      socket.off('voice:ice-candidate', handleIceCandidateEvent);
      socket.off('voice:user-joined', handleUserJoined);
      socket.off('voice:user-left', handleUserLeft);
    };
  }, [userId]);

  const joinChannel = useCallback(async (channelId: string) => {
    const socket = getSocket();
    if (!socket) return;

    initAudioEngine();

    const localStream = await getStream();
    streamRef.current = localStream;

    socket.emit('voice:join', channelId);
    voiceStore.setChannel(channelId);

    // Wait for participants list, then create connections to existing users
    socket.once('voice:participants', async ({ participants }) => {
      voiceStore.setParticipants(participants);

      for (const participant of participants) {
        if (participant.userId === userId) continue;
        createPeerConnection(participant.userId, localStream, socket);
        await createOffer(participant.userId, socket);
      }
    });
  }, [userId, getStream]);

  const leaveChannel = useCallback(() => {
    const socket = getSocket();
    socket?.emit('voice:leave');

    closeAllConnections();
    destroyAudioEngine();
    stopStream();
    voiceStore.setChannel(null);
  }, [stopStream]);

  const toggleMute = useCallback(() => {
    const newMuted = !voiceStore.isMuted;
    voiceStore.setMuted(newMuted);
    setStreamMuted(newMuted);
  }, [setStreamMuted]);

  const toggleDeafen = useCallback(() => {
    const newDeafened = !voiceStore.isDeafened;
    voiceStore.setDeafened(newDeafened);
    setAudioDeafened(newDeafened);
    if (newDeafened) {
      setStreamMuted(true);
    }
  }, [setStreamMuted]);

  return { joinChannel, leaveChannel, toggleMute, toggleDeafen };
}
