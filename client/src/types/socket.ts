import type { Message } from './models';

export interface ServerToClientEvents {
  'message:new': (message: Message) => void;
  'message:typing': (data: { channelId: string; userId: string; username: string }) => void;
  'user:online': (userId: string) => void;
  'user:offline': (userId: string) => void;
  'voice:user-joined': (data: { userId: string; username: string; channelId: string }) => void;
  'voice:user-left': (data: { userId: string; channelId: string }) => void;
  'voice:participants': (data: { channelId: string; participants: VoiceParticipant[] }) => void;
  'voice:offer': (data: { from: string; offer: RTCSessionDescriptionInit }) => void;
  'voice:answer': (data: { from: string; answer: RTCSessionDescriptionInit }) => void;
  'voice:ice-candidate': (data: { from: string; candidate: RTCIceCandidateInit }) => void;
}

export interface ClientToServerEvents {
  'channel:join': (channelId: string) => void;
  'channel:leave': (channelId: string) => void;
  'message:send': (data: { channelId: string; content: string }) => void;
  'message:typing': (channelId: string) => void;
  'voice:join': (channelId: string) => void;
  'voice:leave': () => void;
  'voice:offer': (data: { to: string; offer: RTCSessionDescriptionInit }) => void;
  'voice:answer': (data: { to: string; answer: RTCSessionDescriptionInit }) => void;
  'voice:ice-candidate': (data: { to: string; candidate: RTCIceCandidateInit }) => void;
}

export interface VoiceParticipant {
  userId: string;
  username: string;
}
