'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';

declare global {
  interface Window {
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume: number;
      }) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, callback: (data: unknown) => void) => boolean;
  removeListener: (event: string, callback?: (data: unknown) => void) => boolean;
  getCurrentState: () => Promise<SpotifyPlayerState | null>;
  setVolume: (volume: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
}

interface SpotifyPlayerState {
  paused: boolean;
  track_window: {
    current_track: {
      id: string;
      name: string;
      artists: { name: string }[];
      album: { name: string; images: { url: string }[] };
      uri: string;
      duration_ms: number;
    };
  };
}

// Singleton: only ever create one player instance per page load
let sdkScriptLoaded = false;
let sdkReady = false;

export function useSpotifyPlayer() {
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const initializedRef = useRef(false);
  const {
    accessToken,
    setDeviceId,
    setCurrentTrack,
    setIsPlaying,
    setError,
    volume,
  } = useAppStore();

  // Always read the latest token from store (avoids stale closure in getOAuthToken)
  const accessTokenRef = useRef(accessToken);
  useEffect(() => { accessTokenRef.current = accessToken; }, [accessToken]);

  const initPlayer = useCallback(() => {
    if (initializedRef.current || !window.Spotify || !accessTokenRef.current) return;
    initializedRef.current = true;
    console.log('[Spotify SDK] Initializing player…');

    const player = new window.Spotify.Player({
      name: 'MoodFlow AI',
      getOAuthToken: (cb) => {
        // Always use the latest token
        const token = accessTokenRef.current ?? useAppStore.getState().accessToken;
        if (token) cb(token);
      },
      volume: volume / 100,
    });

    player.addListener('ready', (data) => {
      const { device_id } = data as { device_id: string };
      console.log('[Spotify SDK] ✅ Ready — device_id:', device_id);
      setDeviceId(device_id);
    });

    player.addListener('not_ready', (data) => {
      const { device_id } = data as { device_id: string };
      console.warn('[Spotify SDK] ⚠️ Device went offline:', device_id);
      setDeviceId(null);
    });

    player.addListener('player_state_changed', (state) => {
      const s = state as SpotifyPlayerState | null;
      if (!s) return;
      setIsPlaying(!s.paused);
      const ct = s.track_window.current_track;
      setCurrentTrack({
        id: ct.id,
        name: ct.name,
        artists: ct.artists.map(a => ({ id: '', name: a.name })),
        album: {
          id: '',
          name: ct.album.name,
          images: ct.album.images.map(img => ({ url: img.url, width: 300, height: 300 })),
        },
        duration_ms: ct.duration_ms,
        preview_url: null,
        uri: ct.uri,
        external_urls: { spotify: '' },
      });
    });

    player.addListener('initialization_error', (data: unknown) => {
      const { message } = data as { message: string };
      console.error('[Spotify SDK] Init error:', message);
      setError(`Spotify player init failed: ${message}`);
      initializedRef.current = false;
    });

    player.addListener('authentication_error', (data: unknown) => {
      const { message } = data as { message: string };
      console.error('[Spotify SDK] Auth error:', message);
      setError(`Spotify auth error: ${message}`);
      initializedRef.current = false;
    });

    player.addListener('account_error', (data: unknown) => {
      const { message } = data as { message: string };
      console.error('[Spotify SDK] Account error:', message);
      setError('Spotify Premium required for playback.');
      initializedRef.current = false;
    });

    player.connect().then((success) => {
      if (success) {
        console.log('[Spotify SDK] Connected ✅');
      } else {
        console.error('[Spotify SDK] connect() returned false');
        setError('Spotify player failed to connect. Check Spotify Premium.');
        initializedRef.current = false;
      }
    });

    playerRef.current = player;
  }, [volume, setDeviceId, setCurrentTrack, setIsPlaying, setError]);

  useEffect(() => {
    if (!accessToken) return;

    const tryInit = () => {
      if (sdkReady && window.Spotify) {
        initPlayer();
      } else if (!sdkScriptLoaded) {
        sdkScriptLoaded = true;
        window.onSpotifyWebPlaybackSDKReady = () => {
          console.log('[Spotify SDK] SDK ready callback fired');
          sdkReady = true;
          initPlayer();
        };
        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        document.head.appendChild(script);
        console.log('[Spotify SDK] Script tag added to head');
      } else {
        // Script is loading — wait for the callback
        console.log('[Spotify SDK] Script already loading, waiting for ready callback…');
        window.onSpotifyWebPlaybackSDKReady = () => {
          sdkReady = true;
          initPlayer();
        };
      }
    };

    tryInit();

    return () => {
      // Don't disconnect on unmount — keep the player alive across re-renders
    };
  }, [accessToken, initPlayer]);

  const togglePlay = useCallback(() => playerRef.current?.togglePlay(), []);
  const nextTrack = useCallback(() => playerRef.current?.nextTrack(), []);
  const previousTrack = useCallback(() => playerRef.current?.previousTrack(), []);
  const setPlayerVolume = useCallback((v: number) => playerRef.current?.setVolume(v / 100), []);

  return { togglePlay, nextTrack, previousTrack, setPlayerVolume };
}
