'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import styles from './VoiceOrb.module.css';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceOrbProps {
  onPress: () => void;
}

const stateConfig = {
  idle: {
    label: 'Click to Talk',
    sublabel: 'Tell me your mood',
    color: 'var(--violet)',
    glow: 'var(--violet-glow)',
    pulseColor: 'rgba(139, 92, 246, 0.3)',
  },
  wake_word: {
    label: 'Listening…',
    sublabel: 'Say "Hey Jabajaba"',
    color: 'var(--cyan)',
    glow: 'var(--cyan-glow)',
    pulseColor: 'rgba(6, 182, 212, 0.3)',
  },
  listening: {
    label: 'Listening…',
    sublabel: 'Tell me your mood',
    color: 'var(--cyan)',
    glow: 'var(--cyan-glow)',
    pulseColor: 'rgba(6, 182, 212, 0.3)',
  },
  processing: {
    label: 'Thinking…',
    sublabel: 'Curating your vibe',
    color: 'var(--amber)',
    glow: 'rgba(245, 158, 11, 0.3)',
    pulseColor: 'rgba(245, 158, 11, 0.2)',
  },
  playing: {
    label: 'Playing',
    sublabel: 'Click to change vibe',
    color: 'var(--green)',
    glow: 'rgba(16, 185, 129, 0.3)',
    pulseColor: 'rgba(16, 185, 129, 0.2)',
  },
};

export function VoiceOrb({ onPress }: VoiceOrbProps) {
  const { listeningState, amplitude, transcript } = useAppStore();
  const config = stateConfig[listeningState];
  const isListening = listeningState === 'listening';
  const isProcessing = listeningState === 'processing';

  return (
    <div className={styles.container}>
      {/* Ambient glow blob */}
      <motion.div
        className={styles.ambientGlow}
        animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: config.glow }}
      />

      {/* Pulse rings when listening */}
      <AnimatePresence>
        {(isListening) && [0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={styles.pulseRing}
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.55,
              ease: 'easeOut',
            }}
            style={{ background: config.pulseColor }}
          />
        ))}
      </AnimatePresence>

      {/* Main orb button */}
      <motion.button
        id="voice-orb-btn"
        className={styles.orb}
        onClick={onPress}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        animate={{
          boxShadow: isListening
            ? [
                `0 0 0 0px ${config.pulseColor}`,
                `0 0 60px 20px ${config.pulseColor}`,
                `0 0 0 0px ${config.pulseColor}`,
              ]
            : `0 0 40px 8px ${config.glow}`,
        }}
        transition={isListening ? { duration: 1.2, repeat: Infinity } : { duration: 0.3 }}
        aria-label={config.label}
        aria-pressed={isListening}
      >
        {/* Spinning gradient ring */}
        <motion.div
          className={styles.spinRing}
          animate={{ rotate: isListening || isProcessing ? 360 : 0 }}
          transition={{ duration: isProcessing ? 1.5 : 6, repeat: Infinity, ease: 'linear' }}
          style={{
            background: `conic-gradient(from 0deg, ${config.color}, transparent, ${config.color})`,
          }}
        />

        {/* Inner glass circle */}
        <div className={styles.inner}>
          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <Loader2 className={styles.icon} style={{ color: config.color, animation: 'spin-icon 1s linear infinite' }} />
              </motion.div>
            ) : isListening ? (
              <motion.div
                key="mic-active"
                className={styles.equalizerContainer}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className={styles.eqBar}
                    style={{ background: config.color }}
                    animate={{
                      scaleY: amplitude > 0
                        ? [1, 1 + amplitude * 3 * (0.5 + Math.random()), 1]
                        : [0.2, 1, 0.2],
                    }}
                    transition={{
                      duration: 0.3 + i * 0.05,
                      repeat: Infinity,
                      delay: i * 0.07,
                    }}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="mic"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Mic className={styles.icon} style={{ color: config.color }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.button>

      {/* Label */}
      <motion.div
        className={styles.labelArea}
        key={listeningState}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <p className={styles.label}>{config.label}</p>
        <AnimatePresence>
          {transcript && isListening && (
            <motion.p
              className={styles.transcript}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              "{transcript}"
            </motion.p>
          )}
        </AnimatePresence>
        {!transcript && (
          <p className={styles.sublabel}>{config.sublabel}</p>
        )}
      </motion.div>
    </div>
  );
}
