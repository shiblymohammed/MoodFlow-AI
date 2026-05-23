'use client';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useAppStore } from '@/store/useAppStore';
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer';
import styles from './PlaybackControls.module.css';
import {
  SkipBack, Play, Pause, SkipForward, Volume2,
  ListMusic, ChevronDown, Music2, Shuffle, Repeat, Repeat1,
} from 'lucide-react';

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function PlaybackControls() {
  const {
    isPlaying, volume, setVolume, deviceId,
    queue, currentTrack, accessToken,
    playbackPositionMs,
    shuffle, setShuffle,
    repeatMode, setRepeatMode,
    dominantColor,
  } = useAppStore();

  const { togglePlay, nextTrack, previousTrack, setPlayerVolume } = useSpotifyPlayer();
  const [queueOpen, setQueueOpen] = useState(false);

  const duration = currentTrack?.duration_ms ?? 0;
  const progress = duration > 0 ? Math.min(playbackPositionMs / duration, 1) : 0;
  const col = dominantColor ?? 'var(--violet)';

  // ── Volume ──────────────────────────────────────────────
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

  // ── Seek ─────────────────────────────────────────────────
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!deviceId || !accessToken || !duration) return;
    const posMs = Math.round(Number(e.target.value) * duration);
    fetch('/api/spotify/playback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'seek', deviceId, positionMs: posMs }),
    }).catch(console.error);
  }, [deviceId, accessToken, duration]);

  // ── Shuffle ───────────────────────────────────────────────
  const handleShuffle = useCallback(() => {
    const next = !shuffle;
    setShuffle(next);
    if (deviceId && accessToken) {
      fetch('/api/spotify/playback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'shuffle', deviceId, state: next }),
      }).catch(console.error);
    }
  }, [shuffle, setShuffle, deviceId, accessToken]);

  // ── Repeat ────────────────────────────────────────────────
  const handleRepeat = useCallback(() => {
    const modes: ('off' | 'track' | 'context')[] = ['off', 'track', 'context'];
    const next = modes[(modes.indexOf(repeatMode) + 1) % 3];
    setRepeatMode(next);
    if (deviceId && accessToken) {
      fetch('/api/spotify/playback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'repeat', deviceId, state: next }),
      }).catch(console.error);
    }
  }, [repeatMode, setRepeatMode, deviceId, accessToken]);

  const upNext = queue.filter(t => t.id !== currentTrack?.id);

  return (
    <motion.div
      className={`${styles.controls} glass`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Progress / Seek bar */}
      <div className={styles.seekRow}>
        <span className={styles.seekTime}>{formatMs(playbackPositionMs)}</span>
        <div className={styles.seekTrackWrapper}>
          <div className={styles.seekTrack}>
            <div
              className={styles.seekFill}
              style={{ width: `${progress * 100}%`, background: col }}
            />
          </div>
          <input
            type="range"
            id="seek-bar"
            className={styles.seekInput}
            min={0}
            max={1}
            step={0.001}
            value={progress}
            onChange={handleSeek}
            aria-label="Seek"
          />
        </div>
        <span className={styles.seekTime}>{formatMs(duration)}</span>
      </div>

      {/* Transport + Shuffle/Repeat */}
      <div className={styles.transport}>
        {/* Shuffle */}
        <motion.button
          id="shuffle-btn"
          className={`${styles.modeBtn} ${shuffle ? styles.modeBtnActive : ''}`}
          onClick={handleShuffle}
          whileTap={{ scale: 0.88 }}
          title={shuffle ? 'Shuffle on' : 'Shuffle off'}
          style={shuffle ? { color: col } : {}}
        >
          <Shuffle size={16} />
        </motion.button>

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
          style={{ background: `linear-gradient(135deg, ${col}, var(--cyan))` }}
          animate={{
            boxShadow: isPlaying
              ? [`0 0 0px ${col}00`, `0 0 28px ${col}88`, `0 0 0px ${col}00`]
              : `0 0 0px ${col}00`,
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

        {/* Repeat */}
        <motion.button
          id="repeat-btn"
          className={`${styles.modeBtn} ${repeatMode !== 'off' ? styles.modeBtnActive : ''}`}
          onClick={handleRepeat}
          whileTap={{ scale: 0.88 }}
          title={repeatMode === 'off' ? 'Repeat off' : repeatMode === 'track' ? 'Repeat track' : 'Repeat all'}
          style={repeatMode !== 'off' ? { color: col } : {}}
        >
          {repeatMode === 'track' ? <Repeat1 size={16} /> : <Repeat size={16} />}
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
                    <Image src={track.album.images[0].url} alt={track.album.name} fill sizes="32px" className={styles.queueThumbImg} />
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
