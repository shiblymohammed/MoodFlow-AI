'use client';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from './SpotifyLogin.module.css';

export function SpotifyLogin() {
  const handleLogin = async () => {
    // Generate PKCE values client-side
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const state = crypto.randomUUID();

    sessionStorage.setItem('pkce_verifier', verifier);
    sessionStorage.setItem('oauth_state', state);

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
      client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ?? '',
      response_type: 'code',
      redirect_uri: `${window.location.origin}/callback`,
      scope: scopes,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state,
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params}`;
  };

  return (
    <div className={styles.container}>
      {/* Animated logo mark */}
      <motion.div
        className={styles.logoMark}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div className={styles.orbRing} />
        <div className={styles.orbCore}>
          <span className={styles.orbEmoji}>🎵</span>
        </div>
      </motion.div>

      <motion.div
        className={styles.textArea}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <h1 className={styles.title}>
          <span className="gradient-text">MoodFlow</span> AI
        </h1>
        <p className={styles.tagline}>
          Your AI music companion that curates the perfect soundtrack for every feeling.
        </p>
        <p className={styles.subtitle}>
          Just tell it how you feel. The music follows.
        </p>
      </motion.div>

      {/* Feature chips */}
      <motion.div
        className={styles.features}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {[
          { icon: '🎙️', label: 'Voice-first' },
          { icon: '🧠', label: 'AI mood engine' },
          { icon: '🎧', label: 'Spotify powered' },
          { icon: '✨', label: 'Zero searching' },
        ].map((f, i) => (
          <motion.div
            key={f.label}
            className={styles.featureChip}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.08 }}
          >
            <span>{f.icon}</span>
            <span>{f.label}</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.button
        id="spotify-login-btn"
        className={styles.loginBtn}
        onClick={handleLogin}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
        whileHover={{ scale: 1.04, boxShadow: '0 0 32px rgba(139, 92, 246, 0.5)' }}
        whileTap={{ scale: 0.97 }}
      >
        <SpotifyIcon />
        Connect with Spotify
      </motion.button>

      <motion.p
        className={styles.disclaimer}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        Requires Spotify Premium · Your data stays private
      </motion.p>
    </div>
  );
}

function SpotifyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

// PKCE helpers (browser-side)
function generateCodeVerifier(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const arr = new Uint8Array(128);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join('');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
