'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useAppStore, PlayedEntry, MoodEntry } from '@/store/useAppStore';
import { Trash2, Music2, BarChart2, Clock } from 'lucide-react';
import styles from './SessionHistory.module.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000)  return 'Just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3600_000)}h ago`;
}

function clockTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const ENERGY_COLORS = [
  { max: 0.3, color: '#60a5fa' }, // calm  → blue
  { max: 0.5, color: '#34d399' }, // chill → green
  { max: 0.7, color: '#f59e0b' }, // mid   → amber
  { max: 0.9, color: '#f97316' }, // high  → orange
  { max: 1.0, color: '#ef4444' }, // max   → red
];

function energyColor(energy: number): string {
  return ENERGY_COLORS.find(e => energy <= e.max)?.color ?? '#ef4444';
}

// ─── Song History ─────────────────────────────────────────────────────────────

function SongList({ entries, onClear }: { entries: PlayedEntry[]; onClear: () => void }) {
  if (entries.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Music2 size={28} opacity={0.3} />
        <p>No songs played yet this session</p>
        <span>Ask MoodFlow for some music!</span>
      </div>
    );
  }

  return (
    <div className={styles.listWrapper}>
      <div className={styles.listHeader}>
        <span className={styles.listCount}>{entries.length} tracks</span>
        <button className={styles.clearBtn} onClick={onClear} title="Clear history">
          <Trash2 size={12} /> Clear
        </button>
      </div>
      <div className={styles.songList}>
        {entries.map((entry, i) => (
          <motion.div
            key={entry.id}
            className={styles.songRow}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            {/* Album art */}
            <div className={styles.thumb}>
              {entry.track.album.images[0] ? (
                <Image
                  src={entry.track.album.images[0].url}
                  alt={entry.track.album.name}
                  fill
                  sizes="40px"
                  className={styles.thumbImg}
                />
              ) : (
                <Music2 size={16} />
              )}
            </div>

            {/* Info */}
            <div className={styles.songInfo}>
              <span className={styles.songName}>{entry.track.name}</span>
              <span className={styles.songArtist}>
                {entry.track.artists.map(a => a.name).join(', ')}
              </span>
              {entry.mood && (
                <span
                  className={styles.moodTag}
                  style={{ borderColor: energyColor(entry.mood.energy), color: energyColor(entry.mood.energy) }}
                >
                  {entry.mood.mood}
                </span>
              )}
            </div>

            {/* Time */}
            <div className={styles.songTime}>
              <Clock size={10} />
              <span>{clockTime(entry.playedAt)}</span>
              <span className={styles.relTime}>{relativeTime(entry.playedAt)}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Mood Timeline ─────────────────────────────────────────────────────────────

function MoodTimeline({ entries, onClear }: { entries: MoodEntry[]; onClear: () => void }) {
  if (entries.length === 0) {
    return (
      <div className={styles.emptyState}>
        <BarChart2 size={28} opacity={0.3} />
        <p>No moods detected yet</p>
        <span>Tell MoodFlow how you feel to get started</span>
      </div>
    );
  }

  // Reversed so newest is at top
  const sorted = [...entries].sort((a, b) => b.detectedAt - a.detectedAt);

  return (
    <div className={styles.listWrapper}>
      <div className={styles.listHeader}>
        <span className={styles.listCount}>{entries.length} mood shifts</span>
        <button className={styles.clearBtn} onClick={onClear} title="Clear mood history">
          <Trash2 size={12} /> Clear
        </button>
      </div>

      <div className={styles.timeline}>
        {sorted.map((entry, i) => {
          const color = energyColor(entry.mood.energy);
          const energyPct = Math.round(entry.mood.energy * 100);

          return (
            <motion.div
              key={entry.id}
              className={styles.moodCard}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{ borderColor: `${color}33` }}
            >
              {/* Timeline dot + line */}
              <div className={styles.dot} style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
              {i < sorted.length - 1 && <div className={styles.dotLine} />}

              {/* Card content */}
              <div className={styles.moodContent}>
                {/* Top row */}
                <div className={styles.moodTop}>
                  <span className={styles.moodName} style={{ color }}>
                    {entry.mood.mood}
                  </span>
                  <span className={styles.moodTime}>{clockTime(entry.detectedAt)}</span>
                </div>

                {/* Playlist name */}
                <p className={styles.moodPlaylist}>🎵 {entry.playlistName || 'Unknown Playlist'}</p>

                {/* Energy bar */}
                <div className={styles.energyRow}>
                  <span className={styles.energyLabel}>Energy</span>
                  <div className={styles.energyTrack}>
                    <motion.div
                      className={styles.energyFill}
                      style={{ background: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${energyPct}%` }}
                      transition={{ duration: 0.5, delay: i * 0.04 + 0.1 }}
                    />
                  </div>
                  <span className={styles.energyPct}>{energyPct}%</span>
                </div>

                {/* Genres */}
                <div className={styles.genres}>
                  {entry.mood.genres.slice(0, 3).map(g => (
                    <span key={g} className={styles.genre}>{g}</span>
                  ))}
                </div>

                {/* User query */}
                {entry.query && (
                  <p className={styles.moodQuery}>"{entry.query}"</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function SessionHistory() {
  const [tab, setTab] = useState<'songs' | 'moods'>('songs');
  const { songHistory, moodHistory, clearSongHistory, clearMoodHistory } = useAppStore();

  return (
    <div className={styles.wrapper}>
      {/* Tab bar */}
      <div className={styles.tabs}>
        <button
          id="history-songs-tab"
          className={`${styles.tab} ${tab === 'songs' ? styles.tabActive : ''}`}
          onClick={() => setTab('songs')}
        >
          <Music2 size={13} />
          Songs
          {songHistory.length > 0 && (
            <span className={styles.badge}>{songHistory.length}</span>
          )}
        </button>
        <button
          id="history-moods-tab"
          className={`${styles.tab} ${tab === 'moods' ? styles.tabActive : ''}`}
          onClick={() => setTab('moods')}
        >
          <BarChart2 size={13} />
          Mood Timeline
          {moodHistory.length > 0 && (
            <span className={styles.badge}>{moodHistory.length}</span>
          )}
        </button>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === 'songs' ? (
          <motion.div key="songs"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            <SongList entries={songHistory} onClear={clearSongHistory} />
          </motion.div>
        ) : (
          <motion.div key="moods"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            <MoodTimeline entries={moodHistory} onClear={clearMoodHistory} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
