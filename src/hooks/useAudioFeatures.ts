'use client';
import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

/** Fetches Spotify audio features whenever currentTrack changes */
export function useAudioFeatures() {
  const { currentTrack, accessToken, setAudioFeatures } = useAppStore();

  useEffect(() => {
    if (!currentTrack?.id || !accessToken) return;

    setAudioFeatures(null);

    fetch(`/api/spotify/audio-features?id=${currentTrack.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.tempo) setAudioFeatures(data); })
      .catch(() => {});
  }, [currentTrack?.id, accessToken, setAudioFeatures]);
}
