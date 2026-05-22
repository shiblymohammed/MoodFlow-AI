import type { MoodObject } from './groq';

const SPOTIFY_API = 'https://api.spotify.com/v1';

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  duration_ms: number;
  preview_url: string | null;
  uri: string;
  external_urls: { spotify: string };
}

async function spotifyFetch(endpoint: string, token: string) {
  const res = await fetch(`${SPOTIFY_API}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify API error ${res.status}: ${err}`);
  }
  return res.json();
}

/**
 * Clean up a query string from Groq — Spotify's search doesn't support
 * genre: filters with non-standard genre names (e.g. genre:malayalam → malayalam)
 */
function sanitizeQuery(query: string): string {
  return query
    .replace(/genre:\s*/gi, '')   // remove genre: prefix
    .replace(/artist:\s*/gi, '')  // remove artist: prefix (we handle separately)
    .replace(/year:\d{4}-\d{4}/gi, '') // remove year ranges
    .trim()
    || 'popular songs';
}

export async function searchTracks(
  query: string,
  token: string,
  limit = 20
): Promise<SpotifyTrack[]> {
  const cleanQuery = sanitizeQuery(query);
  const params = new URLSearchParams({
    q: cleanQuery,
    type: 'track',
    limit: String(Math.min(limit, 50)),
    market: 'IN', // improves results for Indian language requests
  });
  const data = await spotifyFetch(`/search?${params}`, token);
  return data.tracks?.items ?? [];
}

/**
 * Build multiple targeted search queries from mood and run them in parallel.
 * Replaces the deprecated /recommendations endpoint.
 */
export async function getRecommendations(
  mood: MoodObject,
  token: string,
  limit = 20
): Promise<SpotifyTrack[]> {
  const queries: string[] = [];

  // 1. Artist-based queries
  for (const artist of mood.seed_artists.slice(0, 2)) {
    queries.push(`${artist} ${mood.genres[0] ?? ''}`.trim());
  }

  // 2. Genre + energy keyword search
  const energyWord = mood.energy > 0.6 ? 'energetic upbeat' : mood.energy < 0.4 ? 'calm relaxing' : '';
  const genreTerms = mood.genres.slice(0, 2).join(' ');
  if (genreTerms) queries.push(`${genreTerms} ${energyWord}`.trim());

  // 3. Valence-based mood keyword
  const moodWord = mood.valence > 0.6 ? 'happy feel good' : mood.valence < 0.4 ? 'melancholic sad' : 'chill';
  queries.push(`${moodWord} ${genreTerms}`.trim());

  // Run all queries in parallel, collect and deduplicate
  const results = await Promise.allSettled(
    queries.map(q =>
      searchTracks(q, token, Math.ceil(limit / queries.length) + 5)
    )
  );

  const seen = new Set<string>();
  const tracks: SpotifyTrack[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') {
      for (const t of r.value) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          tracks.push(t);
        }
      }
    }
  }
  return tracks.slice(0, limit);
}

export async function queueTracks(
  trackUris: string[],
  deviceId: string | undefined,
  token: string
): Promise<void> {
  // Use PUT /me/player/play to start playback immediately with the track list
  const url = `${SPOTIFY_API}/me/player/play${deviceId ? `?device_id=${deviceId}` : ''}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uris: trackUris.slice(0, 50) }),
  });
  if (!res.ok && res.status !== 204) {
    const err = await res.text();
    throw new Error(`Playback start failed ${res.status}: ${err}`);
  }
}

export async function getPlaybackState(token: string) {
  const res = await fetch(`${SPOTIFY_API}/me/player`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204) return null;
  return res.json();
}

export async function controlPlayback(
  action: 'play' | 'pause' | 'next' | 'previous',
  token: string,
  deviceId?: string
) {
  const deviceParam = deviceId ? `?device_id=${deviceId}` : '';
  const endpoints: Record<string, { method: string; path: string }> = {
    play: { method: 'PUT', path: `/me/player/play${deviceParam}` },
    pause: { method: 'PUT', path: `/me/player/pause${deviceParam}` },
    next: { method: 'POST', path: `/me/player/next${deviceParam}` },
    previous: { method: 'POST', path: `/me/player/previous${deviceParam}` },
  };
  const { method, path } = endpoints[action];
  await fetch(`${SPOTIFY_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function setVolume(volumePercent: number, token: string, deviceId?: string) {
  const params = new URLSearchParams({ volume_percent: String(Math.round(volumePercent)) });
  if (deviceId) params.set('device_id', deviceId);
  await fetch(`${SPOTIFY_API}/me/player/volume?${params}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function mergeAndRankTracks(
  searchTracks: SpotifyTrack[],
  recommendedTracks: SpotifyTrack[],
  mood: MoodObject
): SpotifyTrack[] {
  const seen = new Set<string>();
  const merged: SpotifyTrack[] = [];

  // Interleave: 1 recommended, 2 search, repeat
  const maxLen = Math.max(searchTracks.length, recommendedTracks.length);
  let si = 0, ri = 0;
  for (let i = 0; i < maxLen && merged.length < 20; i++) {
    if (ri < recommendedTracks.length) {
      const t = recommendedTracks[ri++];
      if (!seen.has(t.id)) { seen.add(t.id); merged.push(t); }
    }
    if (si < searchTracks.length) {
      const t = searchTracks[si++];
      if (!seen.has(t.id)) { seen.add(t.id); merged.push(t); }
    }
    if (si < searchTracks.length) {
      const t = searchTracks[si++];
      if (!seen.has(t.id)) { seen.add(t.id); merged.push(t); }
    }
  }

  return merged.slice(0, 20);
}
