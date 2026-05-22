import { create } from 'zustand';
import type { SpotifyTrack } from '@/lib/spotify';
import type { MoodObject } from '@/lib/groq';

export type ListeningState = 'idle' | 'wake_word' | 'listening' | 'processing' | 'playing';

export interface ConversationEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  mood?: MoodObject;
  tracks?: SpotifyTrack[];
}

export interface AppState {
  // Auth
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;

  // Playback
  deviceId: string | null;
  setDeviceId: (id: string | null) => void;
  currentTrack: SpotifyTrack | null;
  setCurrentTrack: (track: SpotifyTrack | null) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  volume: number;
  setVolume: (vol: number) => void;
  queue: SpotifyTrack[];
  setQueue: (tracks: SpotifyTrack[]) => void;

  // Voice UI
  listeningState: ListeningState;
  setListeningState: (state: ListeningState) => void;
  transcript: string;
  setTranscript: (text: string) => void;
  amplitude: number;
  setAmplitude: (amp: number) => void;

  // AI / Mood
  currentMood: MoodObject | null;
  setCurrentMood: (mood: MoodObject | null) => void;
  playlistName: string;
  setPlaylistName: (name: string) => void;
  detectedEmotion: { emotion: string; confidence: number; pitch_hz: number; energy_rms: number } | null;
  setDetectedEmotion: (e: { emotion: string; confidence: number; pitch_hz: number; energy_rms: number } | null) => void;

  // Conversation
  conversation: ConversationEntry[];
  addConversationEntry: (entry: ConversationEntry) => void;
  clearConversation: () => void;

  // Error
  error: string | null;
  setError: (err: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  accessToken: null,
  setAccessToken: (token) => set({ accessToken: token }),

  // Playback
  deviceId: null,
  setDeviceId: (id) => set({ deviceId: id }),
  currentTrack: null,
  setCurrentTrack: (track) => set({ currentTrack: track }),
  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  volume: 70,
  setVolume: (vol) => set({ volume: vol }),
  queue: [],
  setQueue: (tracks) => set({ queue: tracks }),

  // Voice UI
  listeningState: 'idle',
  setListeningState: (state) => set({ listeningState: state }),
  transcript: '',
  setTranscript: (text) => set({ transcript: text }),
  amplitude: 0,
  setAmplitude: (amp) => set({ amplitude: amp }),

  // AI / Mood
  currentMood: null,
  setCurrentMood: (mood) => set({ currentMood: mood }),
  playlistName: '',
  setPlaylistName: (name) => set({ playlistName: name }),
  detectedEmotion: null,
  setDetectedEmotion: (e) => set({ detectedEmotion: e }),

  // Conversation
  conversation: [],
  addConversationEntry: (entry) =>
    set((state) => ({
      conversation: [...state.conversation, entry],
    })),
  clearConversation: () => set({ conversation: [] }),

  // Error
  error: null,
  setError: (err) => set({ error: err }),
}));
