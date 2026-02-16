export interface PeerConnection {
  userId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

export interface AudioNode {
  source: MediaStreamAudioSourceNode;
  gain: GainNode;
  analyser: AnalyserNode;
}

export interface VoiceState {
  channelId: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  localStream: MediaStream | null;
  peers: Map<string, PeerConnection>;
  speaking: Set<string>;
}

export interface AudioPreferences {
  inputDeviceId: string;
  outputDeviceId: string;
  inputVolume: number;
  masterVolume: number;
  perUserVolume: Record<string, number>;
}
