'use client';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLyrics } from '@/hooks/useLyrics';
import { useAppStore } from '@/store/useAppStore';
import styles from './Lyrics.module.css';

export function Lyrics() {
  const { currentTrack } = useAppStore();
  const { lines, plain, currentIndex, loading, error } = useLyrics();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef    = useRef<HTMLDivElement>(null);

  // Auto-scroll active line to centre of container
  useEffect(() => {
    if (!activeRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const active    = activeRef.current;
    const targetY   = active.offsetTop - container.clientHeight / 2 + active.clientHeight / 2;
    container.scrollTo({ top: targetY, behavior: 'smooth' });
  }, [currentIndex]);

  if (!currentTrack) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.titleRow}>
        <span className={styles.titleIcon}>🎶</span>
        <span className={styles.title}>Lyrics</span>
        {loading && <span className={styles.loadingDot} />}
      </div>

      <div ref={containerRef} className={styles.scroll}>
        <AnimatePresence mode="wait">

          {/* Loading */}
          {loading && (
            <motion.div
              key="loading"
              className={styles.center}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <div className={styles.shimLine} style={{ width: '80%' }} />
              <div className={styles.shimLine} style={{ width: '60%' }} />
              <div className={styles.shimLine} style={{ width: '70%' }} />
            </motion.div>
          )}

          {/* Error / not found */}
          {!loading && error && (
            <motion.p key="error" className={styles.empty}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              😔 No lyrics found for this track
            </motion.p>
          )}

          {/* No synced, but plain text */}
          {!loading && !error && !lines && plain && (
            <motion.div key="plain" className={styles.plainLyrics}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {plain.split('\n').map((line, i) => (
                <p key={i} className={styles.plainLine}>{line || <br />}</p>
              ))}
            </motion.div>
          )}

          {/* No lyrics at all */}
          {!loading && !error && !lines && !plain && (
            <motion.p key="none" className={styles.empty}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              🎵 No lyrics available
            </motion.p>
          )}

          {/* Synced lyrics */}
          {!loading && lines && lines.length > 0 && (
            <motion.div key="synced"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Top padding so first line can be centered */}
              <div className={styles.topPad} />

              {lines.map((line, i) => {
                const isCurrent  = i === currentIndex;
                const isPast     = i < currentIndex;
                const isUpcoming = i === currentIndex + 1;

                return (
                  <div
                    key={i}
                    ref={isCurrent ? activeRef : undefined}
                    className={`${styles.line}
                      ${isCurrent  ? styles.lineCurrent  : ''}
                      ${isPast     ? styles.linePast     : ''}
                      ${isUpcoming ? styles.lineUpcoming : ''}
                    `}
                  >
                    {isCurrent ? (
                      <motion.span
                        key={`active-${i}`}
                        initial={{ opacity: 0.6, scale: 0.96 }}
                        animate={{ opacity: 1,   scale: 1 }}
                        transition={{ duration: 0.25 }}
                      >
                        {line.text}
                      </motion.span>
                    ) : (
                      <span>{line.text}</span>
                    )}
                  </div>
                );
              })}

              {/* Bottom padding */}
              <div className={styles.bottomPad} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
