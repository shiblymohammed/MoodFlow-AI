'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { useMoodFlow } from '@/hooks/useMoodFlow';
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer';
import { useWakeWord } from '@/hooks/useWakeWord';
import { useContextSignals } from '@/hooks/useContextSignals';
import { VoiceOrb } from '@/components/VoiceOrb/VoiceOrb';
import { NowPlaying } from '@/components/NowPlaying/NowPlaying';
import { PlaybackControls } from '@/components/PlaybackControls/PlaybackControls';
import { ConversationFeed } from '@/components/ConversationFeed/ConversationFeed';
import { SpotifyLogin } from '@/components/SpotifyLogin/SpotifyLogin';
import styles from './page.module.css';
import { AlertCircle, X, LogOut, Radio } from 'lucide-react';

function TextInput({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [value, setValue] = useState('');
  const { listeningState } = useAppStore();
  const isProcessing = listeningState === 'processing';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isProcessing) return;
    onSubmit(value.trim());
    setValue('');
  };

  return (
    <form className={styles.textForm} onSubmit={handleSubmit}>
      <input
        id="mood-text-input"
        type="text"
        className={styles.textInput}
        placeholder='Or type your mood… "rainy night vibes"'
        value={value}
        onChange={e => setValue(e.target.value)}
        disabled={isProcessing}
        aria-label="Type your mood"
      />
      <motion.button
        type="submit"
        className={styles.sendBtn}
        disabled={!value.trim() || isProcessing}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Submit mood"
      >
        →
      </motion.button>
    </form>
  );
}

export default function HomePage() {
  const { accessToken, error, setError, setAccessToken, deviceId, detectedEmotion, setDetectedEmotion } = useAppStore();
  const { startVoiceSession, runPipeline, isSupported } = useMoodFlow();

  // Initialize Spotify player when authed
  useSpotifyPlayer();

  // Context signals: time, weather, device — auto-injected into Groq via useMoodFlow
  const { weatherData } = useContextSignals();

  // Connect to Python OpenWakeWord sidecar — auto-triggers voice session on detection
  // pauseMic/resumeMic tell Python to yield the mic to the browser's Web Speech API
  const { isConnected: wakeWordConnected, pauseMic, resumeMic } = useWakeWord(
    async (emotion) => {
      // Store detected emotion for context injection
      if (emotion) setDetectedEmotion(emotion);
      pauseMic();
      try {
        await startVoiceSession();
      } finally {
        resumeMic();
      }
    }
  );

  // Also wrap manual voice button presses with mic pause
  const handleVoicePress = async () => {
    pauseMic();
    try {
      await startVoiceSession();
    } finally {
      resumeMic();
    }
  };

  // Token is set by the /callback page into Zustand after OAuth exchange.
  // No polling needed — if accessToken is null, show login screen.

  const handleLogout = async () => {
    await fetch('/api/spotify/token', { method: 'DELETE' });
    setAccessToken(null);
  };

  if (!accessToken) {
    return <SpotifyLogin />;
  }

  return (
    <main className={styles.main}>
      {/* Header */}
      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.brand}>
          <span className={styles.brandIcon}>🎵</span>
          <span className={styles.brandName}>
            <span className="gradient-text">MoodFlow</span> AI
          </span>
        </div>
        <div className={styles.headerActions}>
          {/* Weather pill */}
          {weatherData && (
            <div
              className={styles.wakeWordStatus}
              title={`${weatherData.label}, ${weatherData.temperatureCelsius}°C — used to personalise your music`}
            >
              <span>{weatherData.emoji}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                {weatherData.temperatureCelsius}°C
              </span>
            </div>
          )}

          {/* SDK device status */}
          <div
            className={styles.wakeWordStatus}
            title={deviceId ? `SDK device: ${deviceId.slice(0, 8)}…` : 'Spotify SDK connecting…'}
          >
            <span style={{ fontSize: '8px', color: deviceId ? 'var(--green)' : 'var(--amber)' }}>●</span>
            <span style={{ color: deviceId ? 'var(--text-secondary)' : 'var(--amber)', fontSize: '0.75rem' }}>
              {deviceId ? 'SDK ready' : 'SDK connecting…'}
            </span>
          </div>

          {/* Wake word status */}
          <div className={styles.wakeWordStatus} title={wakeWordConnected ? 'Wake word active — say "Hey Jarvis"' : 'Python sidecar not running'}>
            <Radio size={14} style={{ color: wakeWordConnected ? 'var(--cyan)' : 'var(--text-muted)' }} />
            <span style={{ color: wakeWordConnected ? 'var(--cyan)' : 'var(--text-muted)' }}>
              {wakeWordConnected ? 'Hey Jarvis' : 'Wake word off'}
            </span>
          </div>

          {/* Emotion pill — shown after wake word detects voice tone */}
          {detectedEmotion && detectedEmotion.emotion !== 'neutral' && (
            <div
              className={styles.wakeWordStatus}
              title={`Voice emotion: ${detectedEmotion.emotion} (${Math.round(detectedEmotion.confidence * 100)}% confidence) — influences music selection`}
            >
              <span>{
                detectedEmotion.emotion === 'excited'  ? '⚡' :
                detectedEmotion.emotion === 'stressed' ? '😤' :
                detectedEmotion.emotion === 'sad'      ? '😢' :
                detectedEmotion.emotion === 'focused'  ? '🎯' :
                detectedEmotion.emotion === 'sleepy'   ? '😴' : '🎭'
              }</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'capitalize' }}>
                {detectedEmotion.emotion}
              </span>
            </div>
          )}

          <motion.div className={styles.statusDot}
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className={styles.statusLabel}>Spotify connected</span>
          <button
            id="logout-btn"
            className={styles.logoutBtn}
            onClick={handleLogout}
            aria-label="Disconnect Spotify"
          >
            <LogOut size={16} />
          </button>
        </div>
      </motion.header>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            className={styles.errorToast}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss error">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.layout}>
        {/* Left panel — Voice */}
        <motion.section
          className={styles.voicePanel}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <VoiceOrb onPress={isSupported ? handleVoicePress : () => {}} />

          {!isSupported && (
            <motion.p
              className={styles.noSpeechWarning}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ⚠️ Voice not supported. Use text input below.
            </motion.p>
          )}

          <TextInput onSubmit={runPipeline} />
        </motion.section>

        {/* Right panel — Player + Chat */}
        <motion.section
          className={styles.playerPanel}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <NowPlaying />
          <PlaybackControls />
          <ConversationFeed />
        </motion.section>
      </div>

      {/* Mood examples bar */}
      <motion.div
        className={styles.examplesBar}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <span className={styles.examplesLabel}>Try:</span>
        <div className={styles.examples}>
          {[
            '🌧️ Rainy night drive',
            '💪 Gym beast mode',
            '🌙 2AM thoughts',
            '🎓 Deep focus',
            '💔 Sad Tamil melodies',
            '🔥 Summer energy',
          ].map((ex) => (
            <motion.button
              key={ex}
              className={styles.exampleChip}
              onClick={() => runPipeline(ex.replace(/^[^\s]+\s/, ''))}
              whileHover={{ scale: 1.05, borderColor: 'var(--violet-light)' }}
              whileTap={{ scale: 0.97 }}
            >
              {ex}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </main>
  );
}
