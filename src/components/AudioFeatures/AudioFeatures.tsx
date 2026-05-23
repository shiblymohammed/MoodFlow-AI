'use client';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import styles from './AudioFeatures.module.css';

const KEY_NAMES = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={styles.barRow}>
      <span className={styles.barLabel}>{label}</span>
      <div className={styles.barTrack}>
        <motion.div
          className={styles.barFill}
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(value * 100)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <span className={styles.barVal}>{Math.round(value * 100)}%</span>
    </div>
  );
}

export function AudioFeatures() {
  const { audioFeatures, dominantColor } = useAppStore();
  if (!audioFeatures) return null;

  const key  = KEY_NAMES[audioFeatures.key] ?? '?';
  const mode = audioFeatures.mode === 1 ? 'Major' : 'Minor';
  const bpm  = Math.round(audioFeatures.tempo);
  const col  = dominantColor ?? 'var(--violet)';

  return (
    <motion.div
      className={styles.wrapper}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Key stats row */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{bpm}</span>
          <span className={styles.statLabel}>BPM</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statValue}>{key} {mode}</span>
          <span className={styles.statLabel}>Key</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statValue}>{audioFeatures.time_signature}/4</span>
          <span className={styles.statLabel}>Time</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statValue}>{Math.round(audioFeatures.valence * 100)}%</span>
          <span className={styles.statLabel}>Mood</span>
        </div>
      </div>

      {/* Feature bars */}
      <div className={styles.bars}>
        <Bar label="Energy"       value={audioFeatures.energy}       color={col} />
        <Bar label="Dance"        value={audioFeatures.danceability}  color={col} />
        <Bar label="Happiness"    value={audioFeatures.valence}       color={col} />
        <Bar label="Acoustic"     value={audioFeatures.acousticness}  color={col} />
        <Bar label="Instrumental" value={audioFeatures.instrumentalness} color={col} />
      </div>
    </motion.div>
  );
}
