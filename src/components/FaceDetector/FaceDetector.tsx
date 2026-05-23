'use client';
import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, Sparkles, X } from 'lucide-react';
import { useFaceDetection, FACE_EMOJI, FACE_MOOD_MAP, FaceEmotion } from '@/hooks/useFaceDetection';
import styles from './FaceDetector.module.css';

const EMOTION_COLORS: Record<FaceEmotion, string> = {
  happy:     '#22c55e',
  sad:       '#60a5fa',
  angry:     '#ef4444',
  fearful:   '#f59e0b',
  disgusted: '#a855f7',
  surprised: '#f97316',
  neutral:   '#94a3b8',
};

const EMOTION_LABELS: Record<FaceEmotion, string> = {
  happy: 'Happy', sad: 'Sad', angry: 'Angry',
  fearful: 'Anxious', disgusted: 'Dark', surprised: 'Surprised', neutral: 'Calm',
};

interface FaceDetectorProps {
  onMoodDetected: (moodQuery: string) => void;
}

export function FaceDetector({ onMoodDetected }: FaceDetectorProps) {
  const { videoRef, isActive, isLoading, result, error, start, stop } = useFaceDetection();

  const handleUseMood = useCallback(() => {
    if (!result) return;
    onMoodDetected(FACE_MOOD_MAP[result.dominant]);
  }, [result, onMoodDetected]);

  const toggle = useCallback(() => {
    if (isActive) stop();
    else start();
  }, [isActive, start, stop]);

  // Top 3 emotions for the bar chart
  const topEmotions = result
    ? Object.entries(result.expressions)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4) as [FaceEmotion, number][]
    : [];

  return (
    <div className={styles.wrapper}>
      {/* Toggle Button */}
      <motion.button
        id="face-detect-toggle"
        className={`${styles.toggleBtn} ${isActive ? styles.toggleBtnActive : ''}`}
        onClick={toggle}
        whileTap={{ scale: 0.9 }}
        title={isActive ? 'Disable face detection' : 'Detect mood from face'}
        aria-label="Toggle face mood detection"
      >
        {isActive ? <CameraOff size={16} /> : <Camera size={16} />}
        <span>{isActive ? 'Face On' : 'Face Mood'}</span>
        {isLoading && <span className={styles.spinner} />}
      </motion.button>

      {/* Hidden video element (always rendered when active so ref works) */}
      <video
        ref={videoRef}
        className={styles.hiddenVideo}
        muted
        playsInline
        aria-hidden="true"
      />

      {/* Detection Panel */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className={styles.panel}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Close */}
            <button className={styles.closeBtn} onClick={stop} aria-label="Close face detection">
              <X size={14} />
            </button>

            {/* Error state */}
            {error && (
              <div className={styles.errorState}>
                <span>📵</span>
                <p>{error}</p>
              </div>
            )}

            {/* Loading state */}
            {!error && isLoading && (
              <div className={styles.loadingState}>
                <div className={styles.loadingOrb} />
                <p>Loading face model…</p>
              </div>
            )}

            {/* No face detected yet */}
            {!error && !isLoading && !result && (
              <div className={styles.waitingState}>
                <span className={styles.waitingEmoji}>👤</span>
                <p>Looking for a face…</p>
              </div>
            )}

            {/* Detection result */}
            {!error && result && (
              <>
                {/* Dominant emotion display */}
                <div className={styles.dominantEmotion}>
                  <motion.span
                    className={styles.dominantEmoji}
                    key={result.dominant}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    {FACE_EMOJI[result.dominant]}
                  </motion.span>
                  <div className={styles.dominantInfo}>
                    <span
                      className={styles.dominantLabel}
                      style={{ color: EMOTION_COLORS[result.dominant] }}
                    >
                      {EMOTION_LABELS[result.dominant]}
                    </span>
                    <span className={styles.dominantConf}>
                      {result.confidence}% confidence
                    </span>
                  </div>
                </div>

                {/* Emotion bars */}
                <div className={styles.bars}>
                  {topEmotions.map(([emotion, score]) => (
                    <div key={emotion} className={styles.barRow}>
                      <span className={styles.barEmoji}>{FACE_EMOJI[emotion]}</span>
                      <div className={styles.barTrack}>
                        <motion.div
                          className={styles.barFill}
                          style={{ background: EMOTION_COLORS[emotion] }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.round(score * 100)}%` }}
                          transition={{ duration: 0.4, ease: 'easeOut' }}
                        />
                      </div>
                      <span className={styles.barPct}>
                        {Math.round(score * 100)}%
                      </span>
                    </div>
                  ))}
                </div>

                {/* Play mood button */}
                {result.confidence >= 45 && (
                  <motion.button
                    className={styles.playMoodBtn}
                    onClick={handleUseMood}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={{ borderColor: EMOTION_COLORS[result.dominant] }}
                  >
                    <Sparkles size={14} />
                    Play music for this mood
                  </motion.button>
                )}
              </>
            )}

            <p className={styles.privacyNote}>
              🔒 Processed locally — no data sent anywhere
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
