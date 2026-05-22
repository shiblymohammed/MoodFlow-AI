import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/token-store';
import { controlPlayback, setVolume } from '@/lib/spotify';

const SPOTIFY_API = 'https://api.spotify.com/v1';

async function spotifyPut(path: string, token: string, body?: object) {
  return fetch(`${SPOTIFY_API}${path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** Get the user's active device id, or the first available one */
async function resolveDeviceId(token: string, preferredDeviceId?: string): Promise<string | null> {
  const res = await fetch(`${SPOTIFY_API}/me/player/devices`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const { devices } = await res.json() as { devices: { id: string; is_active: boolean; name: string }[] };
  if (!devices?.length) return null;

  // Prefer the passed deviceId if it's in the list
  if (preferredDeviceId) {
    const match = devices.find(d => d.id === preferredDeviceId);
    if (match) return match.id;
  }
  // Prefer currently active device
  const active = devices.find(d => d.is_active);
  if (active) return active.id;
  // Fall back to first device
  return devices[0].id;
}

export async function POST(request: NextRequest) {
  try {
    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { action, deviceId, trackUris, volume } = body;

    switch (action) {
      case 'transfer': {
        if (!deviceId) return NextResponse.json({ error: 'No deviceId' }, { status: 400 });
        const res = await spotifyPut('/me/player', token, {
          device_ids: [deviceId],
          play: false,
        });
        if (!res.ok && res.status !== 204) {
          const err = await res.text();
          console.warn('[playback/transfer]', res.status, err);
          // Non-fatal — don't block the queue step
        }
        break;
      }

      case 'queue': {
        if (!trackUris?.length) {
          return NextResponse.json({ error: 'No track URIs provided' }, { status: 400 });
        }

        // Resolve the best device to play on
        const resolvedDevice = await resolveDeviceId(token, deviceId);
        console.log('[playback/queue] resolved device:', resolvedDevice, '(preferred:', deviceId, ')');

        if (!resolvedDevice) {
          return NextResponse.json(
            { error: 'No active Spotify device found. Open Spotify on any device first.' },
            { status: 404 }
          );
        }

        // Start playback immediately with the track list
        const playRes = await spotifyPut(
          `/me/player/play?device_id=${resolvedDevice}`,
          token,
          { uris: trackUris.slice(0, 50) }
        );

        if (!playRes.ok && playRes.status !== 204) {
          const errText = await playRes.text();
          console.error('[playback/queue] play failed:', playRes.status, errText);
          return NextResponse.json(
            { error: `Spotify play failed (${playRes.status}): ${errText}` },
            { status: playRes.status }
          );
        }

        console.log('[playback/queue] ✅ Playback started on device:', resolvedDevice);
        break;
      }

      case 'play':
      case 'pause':
      case 'next':
      case 'previous':
        await controlPlayback(action, token, deviceId);
        break;

      case 'volume':
        if (volume !== undefined) {
          await setVolume(volume, token, deviceId);
        }
        break;

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[spotify/playback]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
