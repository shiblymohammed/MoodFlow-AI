'use client';
import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

export interface LyricLine {
  timeMs: number;   // timestamp in milliseconds
  text: string;
}

export interface LyricsState {
  lines: LyricLine[] | null;   // null = synced not available
  plain: string | null;         // plain text fallback
  currentIndex: number;
  loading: boolean;
  error: boolean;
}

/** Parse LRC format: "[mm:ss.xx] lyric text" → LyricLine[] */
function parseLRC(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of lrc.split('\n')) {
    const match = raw.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)$/);
    if (!match) continue;
    const [, mm, ss, cs, text] = match;
    const timeMs = parseInt(mm) * 60000 + parseInt(ss) * 1000 + parseInt(cs.padEnd(3, '0'));
    if (text.trim()) lines.push({ timeMs, text: text.trim() });
  }
  return lines.sort((a, b) => a.timeMs - b.timeMs);
}

export function useLyrics(): LyricsState {
  const { currentTrack, playbackPositionMs } = useAppStore();
  const [lines, setLines] = useState<LyricLine[] | null>(null);
  const [plain, setPlain] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const lastTrackId = useRef<string | null>(null);

  // Fetch lyrics when track changes
  useEffect(() => {
    if (!currentTrack || currentTrack.id === lastTrackId.current) return;
    lastTrackId.current = currentTrack.id;

    setLoading(true);
    setLines(null);
    setPlain(null);
    setError(false);

    const track  = encodeURIComponent(currentTrack.name);
    const artist = encodeURIComponent(currentTrack.artists[0]?.name ?? '');
    const album  = encodeURIComponent(currentTrack.album.name);

    fetch(`/api/lyrics?track=${track}&artist=${artist}&album=${album}`)
      .then(r => r.json())
      .then(data => {
        setLoading(false);
        if (data.synced) {
          setLines(parseLRC(data.synced));
        } else {
          setLines(null);
          setPlain(data.plain ?? null);
        }
      })
      .catch(() => {
        setLoading(false);
        setError(true);
      });
  }, [currentTrack]);

  // Compute active line index from playback position
  let currentIndex = -1;
  if (lines && lines.length > 0) {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (playbackPositionMs >= lines[i].timeMs) {
        currentIndex = i;
        break;
      }
    }
  }

  return { lines, plain, currentIndex, loading, error };
}
