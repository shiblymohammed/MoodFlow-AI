import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const trackId = searchParams.get('id');
  const token   = req.headers.get('authorization')?.replace('Bearer ', '');

  if (!trackId || !token) {
    return NextResponse.json({ error: 'Missing id or token' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 86400 }, // cache 24h — features never change
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Spotify ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch audio features' }, { status: 500 });
  }
}
