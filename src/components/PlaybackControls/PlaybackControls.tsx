'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useAppStore } from '@/store/useAppStore';
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer';
import styles from './PlaybackControls.module.css';
import { SkipBack, Play, Pause, SkipForward, Volume2, ListMusic, ChevronDown, Music2 } from 'lucide-react';

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function PlaybackControls() {
  const { isPlaying, volume, setVolume, deviceId, queue, currentTrack } = useAppStore();
  const { togglePlay, nextTrack, previousTrack, setPlayerVolume } = useSpotifyPlayer();
  const [queueOpen, setQueueOpen] = useState(false);

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

  const upNext = queue.filter(t => t.id !== currentTrack?.id);

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
              ? ['0 0 0px rgba(139,92,246,0)', '0 0 24px rgba(139,92,246,0.5)', '0 0 0px rgba(139,92,246,0)']
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
              {isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" />}
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

      {/* Up Next toggle */}
      {upNext.length > 0 && (
        <button
          id="queue-toggle-btn"
          className={styles.queueToggle}
          onClick={() => setQueueOpen(o => !o)}
          aria-expanded={queueOpen}
        >
          <ListMusic size={13} />
          <span>Up Next</span>
          <span className={styles.queueCount}>{upNext.length}</span>
          <motion.span
            animate={{ rotate: queueOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', marginLeft: 'auto' }}
          >
            <ChevronDown size={13} />
          </motion.span>
        </button>
      )}

      {/* Queue list */}
      <AnimatePresence>
        {queueOpen && upNext.length > 0 && (
          <motion.div
            className={styles.queueList}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {upNext.slice(0, 10).map((track, i) => (
              <motion.div
                key={`${track.id}-${i}`}
                className={styles.queueRow}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <span className={styles.queuePos}>{i + 1}</span>

                <div className={styles.queueThumb}>
                  {track.album.images[0] ? (
                    <Image
                      src={track.album.images[0].url}
                      alt={track.album.name}
                      fill
                      sizes="32px"
                      className={styles.queueThumbImg}
                    />
                  ) : (
                    <Music2 size={12} />
                  )}
                </div>

                <div className={styles.queueInfo}>
                  <span className={styles.queueName}>{track.name}</span>
                  <span className={styles.queueArtist}>{track.artists.map(a => a.name).join(', ')}</span>
                </div>

                {track.duration_ms > 0 && (
                  <span className={styles.queueDur}>{formatMs(track.duration_ms)}</span>
                )}
              </motion.div>
            ))}

            {upNext.length > 10 && (
              <p className={styles.queueMore}>+{upNext.length - 10} more songs</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
