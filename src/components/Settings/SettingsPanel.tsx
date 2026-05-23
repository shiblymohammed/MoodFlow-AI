'use client';
import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Volume2, Languages } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import styles from './SettingsPanel.module.css';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const {
    wakeWordThreshold, setWakeWordThreshold,
    ttsEnabled, setTtsEnabled,
    language, setLanguage,
  } = useAppStore();

  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            className={styles.panel}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            aria-label="Settings panel"
          >
            {/* Header */}
            <div className={styles.header}>
              <span className={styles.title}>⚙️ Settings</span>
              <button className={styles.closeBtn} onClick={onClose} aria-label="Close settings">
                <X size={18} />
              </button>
            </div>

            {/* Wake Word Sensitivity */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <Mic size={15} />
                <span>Wake Word Sensitivity</span>
              </div>
              <p className={styles.hint}>
                Lower = harder to trigger. Higher = more sensitive.
              </p>
              <div className={styles.sliderRow}>
                <span className={styles.sliderLabel}>Low</span>
                <input
                  id="ww-threshold-slider"
                  type="range"
                  className={styles.slider}
                  min={0.3}
                  max={0.9}
                  step={0.05}
                  value={wakeWordThreshold}
                  onChange={e => setWakeWordThreshold(parseFloat(e.target.value))}
                  aria-label="Wake word sensitivity"
                />
                <span className={styles.sliderLabel}>High</span>
              </div>
              <div className={styles.sliderValue}>
                Threshold: <strong>{wakeWordThreshold.toFixed(2)}</strong>
              </div>
            </section>

            {/* TTS Toggle */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <Volume2 size={15} />
                <span>AI Voice Response</span>
              </div>
              <p className={styles.hint}>
                MoodFlow speaks back when a playlist starts playing.
              </p>
              <button
                id="tts-toggle-btn"
                className={`${styles.toggle} ${ttsEnabled ? styles.toggleOn : ''}`}
                onClick={() => setTtsEnabled(!ttsEnabled)}
                aria-label={ttsEnabled ? 'Disable voice response' : 'Enable voice response'}
              >
                <motion.span
                  className={styles.toggleKnob}
                  animate={{ x: ttsEnabled ? 22 : 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                />
              </button>
              <span className={styles.toggleStatus}>
                {ttsEnabled ? '🔊 On' : '🔇 Off'}
              </span>
            </section>

            {/* Language */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <Languages size={15} />
                <span>Voice Language</span>
              </div>
              <p className={styles.hint}>
                Sets the speech recognition language after wake word.
              </p>
              <div className={styles.langButtons}>
                <button
                  id="settings-lang-en"
                  className={`${styles.langBtn} ${language === 'en' ? styles.langBtnActive : ''}`}
                  onClick={() => setLanguage('en')}
                >
                  🇺🇸 English
                </button>
                <button
                  id="settings-lang-ml"
                  className={`${styles.langBtn} ${language === 'ml' ? styles.langBtnActive : ''}`}
                  onClick={() => setLanguage('ml')}
                >
                  🇮🇳 Malayalam
                </button>
              </div>
            </section>

            {/* Conversational DJ hints */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <span>🎧</span>
                <span>DJ Voice Commands</span>
              </div>
              <div className={styles.commands}>
                {[
                  ['🔁 More like this', '"Same vibe" / "Give me more"'],
                  ['🎭 What\'s the vibe?', '"Tell me about this playlist"'],
                  ['⏭ Skip', '"Next" / "Skip this"'],
                  ['⏸ Pause', '"Pause" / "Stop the music"'],
                  ['🔊 Volume', '"Louder" / "Turn it down"'],
                ].map(([cmd, example]) => (
                  <div key={cmd} className={styles.commandRow}>
                    <span className={styles.commandName}>{cmd}</span>
                    <span className={styles.commandEx}>{example}</span>
                  </div>
                ))}
              </div>
            </section>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
