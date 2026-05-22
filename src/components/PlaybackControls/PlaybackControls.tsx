'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer';
import styles from './PlaybackControls.module.css';
import { SkipBack, Play, Pause, SkipForward, Volume2 } from 'lucide-react';

export function PlaybackControls() {
  const { isPlaying, volume, setVolume, deviceId } = useAppStore();
  const { togglePlay, nextTrack, previousTrack, setPlayerVolume } = useSpotifyPlayer();

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    setPlayerVolume(v);
    if (deviceId) {
      fetch('/api/spotify/playback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'volume', deviceId, volume: v }),
      }).catch(console.error);
    }
  };

  return (
    <motion.div
      className={`${styles.controls} glass`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Transport buttons */}
      <div className={styles.transport}>
        <motion.button
          id="playback-prev-btn"
          className={styles.controlBtn}
          onClick={previousTrack}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Previous track"
        >
          <SkipBack size={20} />
        </motion.button>

        <motion.button
          id="playback-play-btn"
          className={styles.playBtn}
          onClick={togglePlay}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          animate={{
            boxShadow: isPlaying
              ? [
                  '0 0 0px rgba(139,92,246,0)',
                  '0 0 24px rgba(139,92,246,0.5)',
                  '0 0 0px rgba(139,92,246,0)',
                ]
              : '0 0 0px rgba(139,92,246,0)',
          }}
          transition={isPlaying ? { duration: 2, repeat: Infinity } : {}}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isPlaying ? 'pause' : 'play'}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {isPlaying ? (
                <Pause size={26} fill="currentColor" />
              ) : (
                <Play size={26} fill="currentColor" />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.button>

        <motion.button
          id="playback-next-btn"
          className={styles.controlBtn}
          onClick={nextTrack}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Next track"
        >
          <SkipForward size={20} />
        </motion.button>
      </div>

      {/* Volume */}
      <div className={styles.volumeRow}>
        <Volume2 size={16} color="var(--text-muted)" />
        <input
          id="volume-slider"
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={handleVolume}
          className={styles.volumeSlider}
          aria-label="Volume"
        />
        <span className={styles.volumeLabel}>{volume}%</span>
      </div>
    </motion.div>
  );
}
