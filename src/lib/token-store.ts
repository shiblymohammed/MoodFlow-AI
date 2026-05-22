import { cookies } from 'next/headers';

const TOKEN_COOKIE = 'spotify_access_token';
const REFRESH_COOKIE = 'spotify_refresh_token';
const EXPIRY_COOKIE = 'spotify_token_expiry';

export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_COOKIE)?.value ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_COOKIE)?.value ?? null;
}

export async function isTokenExpired(): Promise<boolean> {
  const cookieStore = await cookies();
  const expiry = cookieStore.get(EXPIRY_COOKIE)?.value;
  if (!expiry) return true;
  return Date.now() > parseInt(expiry) - 60_000; // refresh 1 min early
}

export function generateCodeVerifier(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  return Array.from({ length: 128 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function buildAuthUrl(codeChallenge: string, state: string): string {
  const scopes = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'playlist-modify-public',
    'playlist-modify-private',
  ].join(' ');

  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    scope: scopes,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    state,
  });

  return `https://accounts.spotify.com/authorize?${params}`;
}
