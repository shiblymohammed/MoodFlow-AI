import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/token-store';

const SPOTIFY_API = 'https://api.spotify.com/v1';

export async function GET(request: NextRequest) {
  try {
    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const q = request.nextUrl.searchParams.get('q');
    if (!q) {
      return NextResponse.json({ error: 'Missing q param' }, { status: 400 });
    }

    const params = new URLSearchParams({
      q,
      type: 'track',
      limit: '5',   // top 5, we'll return the best match
      market: 'IN',
    });

    const res = await fetch(`${SPOTIFY_API}/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[search-track]', res.status, err);
      return NextResponse.json({ track: null });
    }

    const data = await res.json();
    const items = data.tracks?.items ?? [];

    if (items.length === 0) {
      return NextResponse.json({ track: null });
    }

    // Return the top result
    const top = items[0];
    const track = {
      id:         top.id,
      name:       top.name,
      uri:        top.uri,
      duration_ms: top.duration_ms,
      artists:    top.artists.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })),
      album: {
        name:   top.album.name,
        images: top.album.images,
      },
      popularity: top.popularity,
    };

    console.log(`[search-track] "${q}" → ${track.name} by ${track.artists.map((a: { name: string }) => a.name).join(', ')}`);
    return NextResponse.json({ track });
  } catch (err) {
    console.error('[search-track]', err);
    return NextResponse.json({ track: null });
  }
}
