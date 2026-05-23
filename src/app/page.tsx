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
import { SettingsPanel } from '@/components/Settings/SettingsPanel';
import { FaceDetector } from '@/components/FaceDetector/FaceDetector';
import { VibeRoulette } from '@/components/VibeRoulette/VibeRoulette';
import { Lyrics } from '@/components/Lyrics/Lyrics';
import { useBiometrics } from '@/hooks/useBiometrics';
import { SessionHistory } from '@/components/SessionHistory/SessionHistory';
import { AlertCircle, X, LogOut, Radio, Mic, Music2, MessageCircle, Languages, Settings, Heart, History } from 'lucide-react';

type MobileTab = 'voice' | 'player' | 'chat' | 'history';

function TextInput({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [value, setValue] = useState('');
  const { listeningState, language } = useAppStore();
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
        placeholder={language === 'ml' ? 'നിങ്ങളുടെ മൂഡ് ടൈപ്പ് ചെയ്യൂ…' : 'Type your mood… "rainy night vibes"'}
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

const MOOD_CHIPS_EN = [
  '🌧️ Rainy night drive',
  '💪 Gym beast mode',
  '🌙 2AM thoughts',
  '🎓 Deep focus',
  '💔 Sad Tamil melodies',
  '🔥 Summer energy',
];

const MOOD_CHIPS_ML = [
  '🌧️ മഴ രാത്രി',
  '💔 വേദനയുള്ള ഗാനങ്ങൾ',
  '🎵 ക്ലാസ്സിക്കൽ',
  '🔥 പാർട്ടി ഗാനങ്ങൾ',
  '😌 ശാന്തമായ ഗാനങ്ങൾ',
  '💑 റൊമാന്റിക്',
];

export default function HomePage() {
  const { accessToken, error, setError, setAccessToken, deviceId, detectedEmotion, setDetectedEmotion, language, setLanguage } = useAppStore();
  const { startVoiceSession, runPipeline, isSupported } = useMoodFlow();
  const [activeTab, setActiveTab] = useState<MobileTab>('voice');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useSpotifyPlayer();
  const { weatherData } = useContextSignals();
  const { state: hrState, data: hrData, isSupported: btSupported, connect: connectHR } = useBiometrics(runPipeline);

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

          {/* Heart rate pill — only when connected */}
          {hrState === 'connected' && hrData && (
            <div className={styles.pill} title={`Heart rate: ${hrData.bpm} BPM — ${hrData.mood}`}>
              <Heart size={11} style={{ color: 'var(--rose)' }} />
              <span className={styles.pillText}>{hrData.bpm} BPM {hrData.emoji}</span>
            </div>
          )}

          {/* Bluetooth connect pill — when supported but idle */}
          {btSupported && hrState === 'idle' && (
            <button
              className={styles.pill}
              onClick={connectHR}
              title="Connect heart rate monitor"
              style={{ cursor: 'pointer' }}
            >
              <Heart size={11} />
              <span className={styles.pillText}>HR</span>
            </button>
          )}

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
          {/* Language toggle */}
          <motion.button
            id="lang-toggle-btn"
            className={`${styles.langToggle} ${language === 'ml' ? styles.langToggleActive : ''}`}
            onClick={() => setLanguage(language === 'en' ? 'ml' : 'en')}
            whileTap={{ scale: 0.9 }}
            title={language === 'ml' ? 'Switch to English' : 'Switch to Malayalam'}
            aria-label="Toggle language"
          >
            <Languages size={13} />
            <span>{language === 'ml' ? 'മല' : 'EN'}</span>
          </motion.button>

          {/* Settings gear */}
          <motion.button
            id="settings-btn"
            className={styles.iconBtn}
            onClick={() => setSettingsOpen(true)}
            whileTap={{ scale: 0.9 }}
            title="Settings"
            aria-label="Open settings"
          >
            <Settings size={16} />
          </motion.button>

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

          {/* Vibe Roulette */}
          <VibeRoulette onVibePicked={runPipeline} />

          {/* Mood chips */}
          <div className={styles.chipsGrid}>
            {(language === 'ml' ? MOOD_CHIPS_ML : MOOD_CHIPS_EN).map((ex) => (
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

          {/* Face mood detection */}
          <FaceDetector onMoodDetected={runPipeline} />
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
          <Lyrics />
          <SessionHistory />
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

              {/* Vibe Roulette */}
              <VibeRoulette onVibePicked={runPipeline} />

              <div className={styles.mobileChips}>
                {(language === 'ml' ? MOOD_CHIPS_ML : MOOD_CHIPS_EN).map((ex) => (
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

              {/* Face mood detection */}
              <FaceDetector onMoodDetected={runPipeline} />
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
              <Lyrics />
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

          {activeTab === 'history' && (
            <motion.div
              key="history"
              className={styles.mobileTab}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <SessionHistory />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Mobile bottom nav ────────────────────────────── */}
      <nav className={styles.bottomNav} aria-label="App navigation">
        {(
          [
            { id: 'voice',   label: 'Voice',   Icon: Mic },
            { id: 'player',  label: 'Player',  Icon: Music2 },
            { id: 'chat',    label: 'Chat',    Icon: MessageCircle },
            { id: 'history', label: 'History', Icon: History },
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

      {/* Settings panel */}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
