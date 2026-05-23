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
import { AlertCircle, X, LogOut, Radio, Mic, Music2, MessageCircle } from 'lucide-react';

type MobileTab = 'voice' | 'player' | 'chat';

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
        placeholder='Type your mood… "rainy night vibes"'
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

const MOOD_CHIPS = [
  '🌧️ Rainy night drive',
  '💪 Gym beast mode',
  '🌙 2AM thoughts',
  '🎓 Deep focus',
  '💔 Sad Tamil melodies',
  '🔥 Summer energy',
];

export default function HomePage() {
  const { accessToken, error, setError, setAccessToken, deviceId, detectedEmotion, setDetectedEmotion } = useAppStore();
  const { startVoiceSession, runPipeline, isSupported } = useMoodFlow();
  const [activeTab, setActiveTab] = useState<MobileTab>('voice');

  useSpotifyPlayer();
  const { weatherData } = useContextSignals();

  const { isConnected: wakeWordConnected, pauseMic, resumeMic } = useWakeWord(
    async (emotion) => {
      if (emotion) setDetectedEmotion(emotion);
      pauseMic();
      try {
        await startVoiceSession();
      } finally {
        resumeMic();
      }
    }
  );

  const handleVoicePress = async () => {
    pauseMic();
    try {
      await startVoiceSession();
    } finally {
      resumeMic();
    }
  };

  const handleLogout = async () => {
    await fetch('/api/spotify/token', { method: 'DELETE' });
    setAccessToken(null);
  };

  if (!accessToken) {
    return <SpotifyLogin />;
  }

  const emotionEmoji =
    detectedEmotion?.emotion === 'excited'  ? '⚡' :
    detectedEmotion?.emotion === 'stressed' ? '😤' :
    detectedEmotion?.emotion === 'sad'      ? '😢' :
    detectedEmotion?.emotion === 'focused'  ? '🎯' :
    detectedEmotion?.emotion === 'sleepy'   ? '😴' : '🎭';

  return (
    <main className={styles.main}>

      {/* ── Header ──────────────────────────────────────── */}
      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.brand}>
          <span className={styles.brandIcon}>🎵</span>
          <span className={styles.brandName}>
            <span className="gradient-text">MoodFlow</span>
            <span className={styles.brandAI}> AI</span>
          </span>
        </div>

        <div className={styles.headerPills}>
          {/* Weather pill */}
          {weatherData && (
            <div className={styles.pill} title={`${weatherData.label}, ${weatherData.temperatureCelsius}°C`}>
              <span>{weatherData.emoji}</span>
              <span className={styles.pillText}>{weatherData.temperatureCelsius}°C</span>
            </div>
          )}

          {/* Wake word status */}
          <div
            className={styles.pill}
            title={wakeWordConnected ? 'Wake word active — say "Hey Jarvis"' : 'Wakeword offline'}
          >
            <Radio size={12} style={{ color: wakeWordConnected ? 'var(--cyan)' : 'var(--text-muted)' }} />
            <span className={styles.pillText} style={{ color: wakeWordConnected ? 'var(--cyan)' : 'var(--text-muted)' }}>
              {wakeWordConnected ? 'Hey Jarvis' : 'Offline'}
            </span>
          </div>

          {/* Emotion pill — only when detected */}
          {detectedEmotion && detectedEmotion.emotion !== 'neutral' && (
            <div className={styles.pill} title={`Detected tone: ${detectedEmotion.emotion}`}>
              <span>{emotionEmoji}</span>
              <span className={styles.pillText} style={{ textTransform: 'capitalize' }}>
                {detectedEmotion.emotion}
              </span>
            </div>
          )}
        </div>

        <div className={styles.headerRight}>
          {/* SDK dot */}
          <div className={styles.sdkDot} title={deviceId ? 'Spotify SDK ready' : 'SDK connecting…'}>
            <motion.span
              className={styles.dot}
              style={{ background: deviceId ? 'var(--green)' : 'var(--amber)' }}
              animate={deviceId ? { opacity: [1, 0.4, 1] } : { opacity: 1 }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className={styles.sdkLabel}>{deviceId ? 'Live' : 'Sync…'}</span>
          </div>

          <button
            id="logout-btn"
            className={styles.iconBtn}
            onClick={handleLogout}
            aria-label="Disconnect Spotify"
          >
            <LogOut size={16} />
          </button>
        </div>
      </motion.header>

      {/* ── Error toast ─────────────────────────────────── */}
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

      {/* ── Desktop layout (2-column) ────────────────────── */}
      <div className={styles.desktopLayout}>
        {/* Left: Voice */}
        <motion.section
          className={styles.voicePanel}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <VoiceOrb onPress={isSupported ? handleVoicePress : () => {}} />
          {!isSupported && (
            <p className={styles.noSpeechWarning}>⚠️ Voice not supported. Use text input.</p>
          )}
          <TextInput onSubmit={runPipeline} />
          {/* Mood chips */}
          <div className={styles.chipsGrid}>
            {MOOD_CHIPS.map((ex) => (
              <motion.button
                key={ex}
                className={styles.chip}
                onClick={() => runPipeline(ex.replace(/^[^\s]+\s/, ''))}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                {ex}
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Right: Player + Chat */}
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

      {/* ── Mobile tab content ───────────────────────────── */}
      <div className={styles.mobileContent}>
        <AnimatePresence mode="wait">
          {activeTab === 'voice' && (
            <motion.div
              key="voice"
              className={styles.mobileTab}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <VoiceOrb onPress={isSupported ? handleVoicePress : () => {}} />
              {!isSupported && (
                <p className={styles.noSpeechWarning}>⚠️ Voice not supported. Use text input.</p>
              )}
              <TextInput onSubmit={runPipeline} />
              <div className={styles.mobileChips}>
                {MOOD_CHIPS.map((ex) => (
                  <motion.button
                    key={ex}
                    className={styles.chip}
                    onClick={() => runPipeline(ex.replace(/^[^\s]+\s/, ''))}
                    whileTap={{ scale: 0.96 }}
                  >
                    {ex}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'player' && (
            <motion.div
              key="player"
              className={styles.mobileTab}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <NowPlaying />
              <PlaybackControls />
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              className={styles.mobileTab}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <ConversationFeed />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Mobile bottom nav ────────────────────────────── */}
      <nav className={styles.bottomNav} aria-label="App navigation">
        {(
          [
            { id: 'voice',  label: 'Voice',  Icon: Mic },
            { id: 'player', label: 'Player', Icon: Music2 },
            { id: 'chat',   label: 'Chat',   Icon: MessageCircle },
          ] as { id: MobileTab; label: string; Icon: React.ElementType }[]
        ).map(({ id, label, Icon }) => (
          <motion.button
            key={id}
            className={`${styles.navBtn} ${activeTab === id ? styles.navBtnActive : ''}`}
            onClick={() => setActiveTab(id)}
            whileTap={{ scale: 0.9 }}
            aria-label={label}
          >
            <Icon size={22} />
            <span className={styles.navLabel}>{label}</span>
            {activeTab === id && (
              <motion.div
                className={styles.navIndicator}
                layoutId="nav-indicator"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </nav>
    </main>
  );
}
