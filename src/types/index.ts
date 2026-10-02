export type SessionState =
  | 'ready'
  | 'requesting-permission'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'muted'
  | 'reconnecting'
  | 'ended'
  | 'error';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isStreaming?: boolean;
}

export type VoiceName = 'Puck' | 'Zephyr' | 'Kore' | 'Charon' | 'Fenrir' | 'Aoede';

export interface AppSettings {
  voice: VoiceName;
  inputSensitivity: number; // 0.5 to 2.0
  noiseSuppression: boolean;
  echoCancellation: boolean;
  speechRecognitionEnabled: boolean;
}
