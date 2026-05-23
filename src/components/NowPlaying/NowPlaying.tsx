'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import styles from './NowPlaying.module.css';
import Image from 'next/image';
import { Music2 } from 'lucide-react';

export function NowPlaying() {
  const { currentTrack, isPlaying, playlistName, currentMood, dominantColor } = useAppStore();

  return (
    <AnimatePresence mode="wait">
      {currentTrack ? (
        <motion.div
          key={currentTrack.id}
          className={`${styles.card} glass`}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          style={dominantColor ? {
            borderColor: `${dominantColor}33`,
            background: `radial-gradient(ellipse at top, ${dominantColor}18 0%, transparent 70%)`,
          } : {}}
        >
          {/* Album art */}
          <div className={styles.artWrapper}>
            <motion.div
              className={styles.artContainer}
              animate={isPlaying ? { rotate: [0, 360] } : { rotate: 0 }}
              transition={isPlaying ? { duration: 20, repeat: Infinity, ease: 'linear' } : {}}
            >
              {currentTrack.album.images[0] ? (
                <Image
                  src={currentTrack.album.images[0].url}
                  alt={currentTrack.album.name}
                  fill
                  className={styles.albumArt}
                  sizes="80px"
                />
              ) : (
                <div className={styles.placeholderArt}>
                  <Music2 size={28} />
                </div>
              )}
            </motion.div>
            {isPlaying && (
              <motion.div
                className={styles.playingIndicator}
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>

          {/* Track info */}
          <div className={styles.info}>
            {playlistName && (
              <motion.p
                className={styles.playlistTag}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {playlistName}
              </motion.p>
            )}
            <h3 className={styles.trackName}>{currentTrack.name}</h3>
            <p className={styles.artistName}>
              {currentTrack.artists.map(a => a.name).join(', ')}
            </p>
            {currentMood && (
              <div className={styles.moodTags}>
                <span className={styles.moodChip}>
                  {currentMood.mood}
                </span>
                <span className={styles.moodChip}>
                  {currentMood.activity ?? currentMood.tempo}
                </span>
              </div>
            )}
          </div>

          {/* Waveform visualizer */}
          {isPlaying && (
            <div className={styles.waveform}>
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className={styles.waveBar}
                  animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 0.6 + i * 0.12,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          key="empty"
          className={`${styles.emptyCard} glass`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Music2 size={32} color="var(--text-muted)" />
          <p className={styles.emptyText}>No track playing</p>
          <p className={styles.emptySubtext}>Tell me what you're feeling</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
