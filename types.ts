export enum AppMode {
  NEURAL_HUB = 'NEURAL_HUB',
  CHAT = 'CHAT',
  LIVE_VOICE = 'LIVE_VOICE',
  IMAGE_STUDIO = 'IMAGE_STUDIO',
  DEEP_THINK = 'DEEP_THINK'
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // base64
  isThinking?: boolean;
  groundingMetadata?: GroundingMetadata;
}

export interface GroundingMetadata {
  groundingChunks?: Array<{
    web?: { uri?: string; title?: string };
    maps?: { uri?: string; title?: string; source?: string };
  }>;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface LiveConnectionState {
  isConnected: boolean;
  isSpeaking: boolean;
  volume: number;
}
