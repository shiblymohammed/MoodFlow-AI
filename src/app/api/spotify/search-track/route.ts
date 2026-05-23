import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/token-store';

const SPOTIFY_API = 'https://api.spotify.com/v1';

function mapTrack(top: Record<string, unknown>) {
  const album = top.album as { name: string; images: unknown[] };
  const artists = top.artists as { id: string; name: string }[];
  return {
    id:          top.id as string,
    name:        top.name as string,
    uri:         top.uri as string,
    duration_ms: top.duration_ms as number,
    preview_url: top.preview_url as string | null,
    popularity:  top.popularity as number,
    artists:     artists.map(a => ({ id: a.id, name: a.name })),
    album: {
      id:     '',
      name:   album.name,
      images: album.images,
    },
    external_urls: { spotify: '' },
  };
}

export async function GET(request: NextRequest) {
  try {
    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const q     = sp.get('q');
    const limit = Math.min(parseInt(sp.get('limit') ?? '1', 10), 20);

    if (!q) {
      return NextResponse.json({ error: 'Missing q param' }, { status: 400 });
    }

    const params = new URLSearchParams({
      q,
      type: 'track',
      limit: String(Math.max(limit, 10)), // always fetch at least 10 so we can return best match
      market: 'IN',
    });

    const res = await fetch(`${SPOTIFY_API}/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error('[search-track]', res.status, await res.text());
      return NextResponse.json({ track: null, tracks: [] });
    }

    const data  = await res.json();
    const items = (data.tracks?.items ?? []) as Record<string, unknown>[];

    if (items.length === 0) {
      return NextResponse.json({ track: null, tracks: [] });
    }

    const tracks = items.map(mapTrack);
    const track  = tracks[0]; // best match

    console.log(`[search-track] "${q}" → ${track.name} by ${track.artists.map(a => a.name).join(', ')} (${tracks.length} total)`);

    // Return both single best match AND full list (for queue filling)
    return NextResponse.json({ track, tracks });
  } catch (err) {
    console.error('[search-track]', err);
    return NextResponse.json({ track: null, tracks: [] });
  }
}
