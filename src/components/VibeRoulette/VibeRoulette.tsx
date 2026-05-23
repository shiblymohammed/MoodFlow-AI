'use client';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './VibeRoulette.module.css';

/** Diverse mood pool — each click picks one at random */
const VIBE_POOL = [
  { label: 'Summer Festival',        emoji: '🎪', query: 'euphoric summer festival upbeat hits' },
  { label: '3AM Thoughts',           emoji: '🌙', query: 'late night emotional 3am melancholic indie' },
  { label: 'Beast Mode',             emoji: '💪', query: 'aggressive gym workout intense high energy' },
  { label: 'Rainy Coffee Shop',      emoji: '☕', query: 'rainy day chill lofi coffee shop acoustic' },
  { label: 'Heartbreak Hotel',       emoji: '💔', query: 'heartbreak sad emotional breakup songs' },
  { label: 'City Night Drive',       emoji: '🌆', query: 'night drive city lights synthwave electronic' },
  { label: 'Beach Sunset',           emoji: '🌅', query: 'chill beach sunset tropical vibes reggae' },
  { label: 'Romantic Candlelight',   emoji: '🕯️', query: 'romantic dinner soft jazz love ballads' },
  { label: '2000s Throwback',        emoji: '📼', query: 'nostalgic 2000s pop hits throwback classics' },
  { label: 'Malayalam Classics',     emoji: '🎵', query: 'classic malayalam film songs KS Chithra' },
  { label: 'Indie Folk Story',       emoji: '🪕', query: 'indie folk acoustic storytelling singer songwriter' },
  { label: 'Jazz After Midnight',    emoji: '🎷', query: 'late night jazz blues saxophone smooth' },
  { label: 'Space Meditation',       emoji: '🚀', query: 'ambient space meditation deep focus flow' },
  { label: 'Morning Yoga',           emoji: '🧘', query: 'peaceful morning yoga flow calm awakening' },
  { label: 'Party Banger',           emoji: '🔥', query: 'party banger hype club dance hits' },
  { label: 'Cinematic Epic',         emoji: '🎬', query: 'epic cinematic orchestral film score dramatic' },
  { label: 'K-Pop Energy',           emoji: '⭐', query: 'kpop girl group upbeat catchy dance pop' },
  { label: 'Bollywood Feels',        emoji: '🎭', query: 'bollywood romantic hindi film songs melody' },
  { label: 'Reggaeton Fiesta',       emoji: '🪩', query: 'reggaeton latin dance party fiesta' },
  { label: 'Deep Dark Electronic',   emoji: '🌑', query: 'dark techno deep electronic underground bass' },
];

interface VibeRouletteProps {
  onVibePicked: (query: string) => void;
}

export function VibeRoulette({ onVibePicked }: VibeRouletteProps) {
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'picked'>('idle');
  const [picked, setPicked] = useState<typeof VIBE_POOL[0] | null>(null);

  const spin = useCallback(async () => {
    if (phase !== 'idle') return;

    setPhase('spinning');
    setPicked(null);

    // Quick visual shuffle — show 3 random labels fast
    await new Promise(r => setTimeout(r, 900));

    // Pick a random vibe (never same as last)
    const pool = picked
      ? VIBE_POOL.filter(v => v.label !== picked.label)
      : VIBE_POOL;
    const choice = pool[Math.floor(Math.random() * pool.length)];

    setPicked(choice);
    setPhase('picked');

    // Start the pipeline
    onVibePicked(choice.query);

    // Return to idle after 3s
    setTimeout(() => setPhase('idle'), 3000);
  }, [phase, picked, onVibePicked]);

  return (
    <div className={styles.wrapper}>
      <motion.button
        id="vibe-roulette-btn"
        className={`${styles.btn} ${phase === 'spinning' ? styles.spinning : ''} ${phase === 'picked' ? styles.picked : ''}`}
        onClick={spin}
        whileTap={phase === 'idle' ? { scale: 0.92 } : {}}
        disabled={phase === 'spinning'}
        aria-label="Vibe Roulette — pick a random mood"
      >
        {/* Dice icon with spin animation */}
        <motion.span
          className={styles.dice}
          animate={
            phase === 'spinning'
              ? { rotate: [0, 180, 360, 540, 720], scale: [1, 1.3, 0.9, 1.2, 1] }
              : phase === 'picked'
              ? { scale: [1, 1.4, 1], rotate: [0, -10, 10, 0] }
              : {}
          }
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          🎲
        </motion.span>

        {/* Label */}
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.span
              key="idle"
              className={styles.label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              Vibe Roulette
            </motion.span>
          )}

          {phase === 'spinning' && (
            <motion.span
              key="spinning"
              className={styles.label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              Spinning…
            </motion.span>
          )}

          {phase === 'picked' && picked && (
            <motion.span
              key="picked"
              className={styles.pickedLabel}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {picked.emoji} {picked.label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Subtitle hint */}
      <AnimatePresence>
        {phase === 'idle' && (
          <motion.p
            className={styles.hint}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            20 random vibes · continuous queue
          </motion.p>
        )}
        {phase === 'picked' && picked && (
          <motion.p
            className={styles.hint}
            style={{ color: 'var(--amber)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Building your {picked.label} playlist…
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
