import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/token-store';
import { searchTracks, getRecommendations, mergeAndRankTracks } from '@/lib/spotify';
import type { MoodObject } from '@/lib/groq';

export async function POST(request: NextRequest) {
  try {
    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { mood }: { mood: MoodObject } = await request.json();

    const [searchResults, recommendations] = await Promise.allSettled([
      searchTracks(mood.query_string, token, 15),
      getRecommendations(mood, token, 20),
    ]);

    const search = searchResults.status === 'fulfilled' ? searchResults.value : [];
    const recs = recommendations.status === 'fulfilled' ? recommendations.value : [];

    // Log what we got (visible in Next.js terminal)
    console.log('[spotify/search] query:', mood.query_string);
    console.log('[spotify/search] search tracks:', search.length, searchResults.status === 'rejected' ? searchResults.reason : '');
    console.log('[spotify/search] rec tracks:', recs.length, recommendations.status === 'rejected' ? recommendations.reason : '');

    const tracks = mergeAndRankTracks(search, recs, mood);
    console.log('[spotify/search] merged total:', tracks.length);

    return NextResponse.json({ tracks, playlistName: mood.playlist_name });
  } catch (err) {
    console.error('[spotify/search]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
