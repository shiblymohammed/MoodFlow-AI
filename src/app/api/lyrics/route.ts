import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy to LRCLIB (https://lrclib.net) — free, no API key, timestamped LRC lyrics.
 * Keeps the external request server-side (no CORS issues, no key exposure).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const track  = searchParams.get('track')  ?? '';
  const artist = searchParams.get('artist') ?? '';
  const album  = searchParams.get('album')  ?? '';

  if (!track || !artist) {
    return NextResponse.json({ error: 'Missing track or artist' }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({ track_name: track, artist_name: artist, album_name: album });
    const res = await fetch(`https://lrclib.net/api/get?${params}`, {
      headers: { 'User-Agent': 'MoodFlow-AI/1.0' },
      next: { revalidate: 3600 }, // cache 1 hour per track
    });

    if (!res.ok) {
      return NextResponse.json({ synced: null, plain: null });
    }

    const data = await res.json();
    return NextResponse.json({
      synced: data.syncedLyrics ?? null,   // LRC format: "[mm:ss.xx] line"
      plain:  data.plainLyrics  ?? null,   // fallback plain text
    });
  } catch {
    return NextResponse.json({ synced: null, plain: null });
  }
}
