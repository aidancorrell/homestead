import type { Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '../types/socket';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const peerConnections = new Map<string, RTCPeerConnection>();
const remoteStreams = new Map<string, MediaStream>();

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

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
): RTCPeerConnection {
  console.log(`[WebRTC] Creating peer connection to ${userId.slice(0, 8)}`);

  // Close existing connection if any
  const existing = peerConnections.get(userId);
  if (existing) {
    console.log(`[WebRTC] Closing existing connection to ${userId.slice(0, 8)}`);
    existing.close();
  }

  const pc = new RTCPeerConnection(RTC_CONFIG);
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
    console.log(`[WebRTC] ICE state for ${userId.slice(0, 8)}: ${pc.iceConnectionState}`);
  };

  pc.onconnectionstatechange = () => {
    console.log(`[WebRTC] Connection state for ${userId.slice(0, 8)}: ${pc.connectionState}`);
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
}

export async function handleIceCandidate(userId: string, candidate: RTCIceCandidateInit) {
  const pc = peerConnections.get(userId);
  if (!pc) return;
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
}

export function closeAllConnections() {
  peerConnections.forEach((pc) => pc.close());
  peerConnections.clear();
  remoteStreams.clear();
}

export function getRemoteStream(userId: string): MediaStream | undefined {
  return remoteStreams.get(userId);
}
