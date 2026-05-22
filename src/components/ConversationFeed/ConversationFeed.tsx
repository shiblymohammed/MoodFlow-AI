'use client';
import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import type { ConversationEntry } from '@/store/useAppStore';
import styles from './ConversationFeed.module.css';
import Image from 'next/image';
import { Bot, User } from 'lucide-react';

function TrackPreview({ tracks }: { tracks: NonNullable<ConversationEntry['tracks']> }) {
  return (
    <div className={styles.trackList}>
      {tracks.slice(0, 4).map((t, i) => (
        <motion.div
          key={t.id}
          className={styles.trackItem}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
        >
          <div className={styles.trackThumb}>
            {t.album.images[0] ? (
              <Image src={t.album.images[0].url} alt={t.album.name} fill sizes="32px" style={{ objectFit: 'cover' }} />
            ) : (
              <div className={styles.trackThumbPlaceholder} />
            )}
          </div>
          <div className={styles.trackMeta}>
            <span className={styles.trackTitle}>{t.name}</span>
            <span className={styles.trackArtist}>{t.artists.map(a => a.name).join(', ')}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function MessageBubble({ entry }: { entry: ConversationEntry }) {
  const isUser = entry.role === 'user';

  return (
    <motion.div
      className={`${styles.message} ${isUser ? styles.userMessage : styles.aiMessage}`}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Avatar */}
      <div className={`${styles.avatar} ${isUser ? styles.userAvatar : styles.aiAvatar}`}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      <div className={styles.bubbleContent}>
        {/* Bubble */}
        <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.aiBubble}`}>
          <p className={styles.bubbleText}
            dangerouslySetInnerHTML={{
              __html: entry.content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            }}
          />
        </div>

        {/* Track preview */}
        {entry.tracks && entry.tracks.length > 0 && (
          <TrackPreview tracks={entry.tracks} />
        )}

        {/* Timestamp */}
        <span className={styles.timestamp}>
          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
}

export function ConversationFeed() {
  const { conversation } = useAppStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  if (conversation.length === 0) return null;

  return (
    <motion.div
      className={`${styles.feed} glass`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className={styles.header}>
        <span className={styles.headerDot} />
        <span className={styles.headerLabel}>Conversation</span>
      </div>
      <div className={styles.messages}>
        <AnimatePresence>
          {conversation.map((entry) => (
            <MessageBubble key={entry.id} entry={entry} />
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </motion.div>
  );
}
