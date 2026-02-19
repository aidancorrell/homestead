import type { User, Server, Channel, Message, ServerMember } from './models';

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  invite_code: string;
  display_name?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateServerRequest {
  name: string;
}

export interface CreateChannelRequest {
  name: string;
  type: 'text' | 'voice';
}

export interface JoinServerRequest {
  invite_code: string;
}

export interface UpdateProfileRequest {
  display_name?: string;
  avatar_url?: string;
}

export interface MessagesResponse {
  messages: Message[];
  hasMore: boolean;
}

export interface ServerWithMembers extends Server {
  members: ServerMember[];
  channels: Channel[];
}
