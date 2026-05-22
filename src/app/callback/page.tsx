'use client';
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { motion } from 'framer-motion';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAccessToken = useAppStore(s => s.setAccessToken);
  const setError = useAppStore(s => s.setError);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      setError(`Spotify auth error: ${error}`);
      router.push('/');
      return;
    }

    if (!code || !state) {
      setError('Missing OAuth parameters');
      router.push('/');
      return;
    }

    const savedState = sessionStorage.getItem('oauth_state');
    if (state !== savedState) {
      // This usually means the page was reloaded mid-auth flow (sessionStorage cleared)
      // Just redirect to login — not a real security issue in local dev
      router.push('/');
      return;
    }

    const codeVerifier = sessionStorage.getItem('pkce_verifier');
    if (!codeVerifier) {
      setError('Missing PKCE verifier');
      router.push('/');
      return;
    }

    const exchangeToken = async () => {
      try {
        const res = await fetch('/api/spotify/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            codeVerifier,
            redirectUri: `${window.location.origin}/callback`,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? 'Token exchange failed');
        }

        const { accessToken } = await res.json();
        setAccessToken(accessToken);

        // Clean up
        sessionStorage.removeItem('pkce_verifier');
        sessionStorage.removeItem('oauth_state');

        router.push('/');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Auth failed');
        router.push('/');
      }
    };

    exchangeToken();
  }, [searchParams, router, setAccessToken, setError]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100dvh',
      gap: '20px',
      position: 'relative',
      zIndex: 1,
    }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: '3px solid transparent',
          borderTopColor: 'var(--violet)',
          borderRightColor: 'var(--cyan)',
        }}
      />
      <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>
        Connecting to Spotify…
      </p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense>
      <CallbackContent />
    </Suspense>
  );
}
