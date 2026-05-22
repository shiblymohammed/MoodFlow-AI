#!/usr/bin/env python3
"""
MoodFlow AI — Emotion Analyzer
Extracts audio features (pitch, speaking rate, energy) from mic input
and sends them over WebSocket alongside WAKE_WORD_DETECTED events.

Requires: pip install librosa soundfile numpy
"""

import numpy as np
import logging

log = logging.getLogger("moodflow-emotion")

# Emotion thresholds (tunable)
PITCH_HIGH  = 220.0   # Hz — above this = excited / stressed
PITCH_LOW   = 140.0   # Hz — below this = sad / calm / sleepy
ENERGY_HIGH = 0.025   # RMS — above this = loud / energetic
ENERGY_LOW  = 0.005   # RMS — below this = quiet / calm


def analyze_audio_chunk(pcm_bytes: bytes, sample_rate: int = 16000) -> dict:
    """
    Analyze a PCM audio chunk and return emotion features.
    Input: raw 16-bit PCM bytes
    Output: dict with pitch_hz, energy_rms, speaking_rate_wpm, emotion, confidence
    """
    try:
        import librosa

        # Convert raw PCM bytes → float32 array
        audio_int16 = np.frombuffer(pcm_bytes, dtype=np.int16)
        audio_float = audio_int16.astype(np.float32) / 32768.0

        if len(audio_float) < sample_rate * 0.1:  # need at least 100ms
            return _neutral_features()

        # 1. Fundamental frequency (pitch) via YIN algorithm
        f0 = librosa.yin(
            audio_float,
            fmin=librosa.note_to_hz('C2'),   # ~65 Hz
            fmax=librosa.note_to_hz('C6'),   # ~1047 Hz
            sr=sample_rate,
        )
        # Filter out unvoiced frames (NaN or 0)
        voiced = f0[(f0 > 65) & (f0 < 1047)]
        pitch_hz = float(np.median(voiced)) if len(voiced) > 0 else 0.0

        # 2. RMS energy
        rms = librosa.feature.rms(y=audio_float)
        energy_rms = float(np.mean(rms))

        # 3. Zero-crossing rate (proxy for speech speed / consonants)
        zcr = librosa.feature.zero_crossing_rate(audio_float)
        zcr_mean = float(np.mean(zcr))

        # 4. Spectral centroid (brightness — higher = more excited)
        centroid = librosa.feature.spectral_centroid(y=audio_float, sr=sample_rate)
        centroid_mean = float(np.mean(centroid))

        # Classify emotion from features
        emotion, confidence = _classify_emotion(pitch_hz, energy_rms, zcr_mean)

        return {
            "pitch_hz":       round(pitch_hz, 1),
            "energy_rms":     round(energy_rms, 4),
            "zcr":            round(zcr_mean, 4),
            "spectral_centroid": round(centroid_mean, 1),
            "emotion":        emotion,
            "confidence":     round(confidence, 2),
        }

    except ImportError:
        log.warning("librosa not installed — emotion analysis disabled")
        return _neutral_features()
    except Exception as e:
        log.debug(f"Audio analysis error: {e}")
        return _neutral_features()


def _classify_emotion(
    pitch_hz: float,
    energy_rms: float,
    zcr: float,
) -> tuple[str, float]:
    """
    Rule-based emotion classifier from audio features.
    Returns (emotion_label, confidence 0–1).
    """
    if pitch_hz == 0.0:
        return "neutral", 0.5

    scores: dict[str, float] = {
        "excited":  0.0,
        "stressed": 0.0,
        "sad":      0.0,
        "focused":  0.0,
        "sleepy":   0.0,
        "neutral":  0.3,  # baseline
    }

    # High pitch + high energy → excited or stressed
    if pitch_hz > PITCH_HIGH and energy_rms > ENERGY_HIGH:
        scores["excited"]  += 0.5
        scores["stressed"] += 0.3

    # High pitch + low energy → stressed / anxious
    elif pitch_hz > PITCH_HIGH and energy_rms <= ENERGY_HIGH:
        scores["stressed"] += 0.5

    # Low pitch + low energy → sad or sleepy
    elif pitch_hz < PITCH_LOW and energy_rms < ENERGY_LOW:
        scores["sad"]   += 0.3
        scores["sleepy"] += 0.4

    # Low pitch + moderate energy → focused / calm
    elif pitch_hz < PITCH_LOW:
        scores["focused"] += 0.4
        scores["sad"]     += 0.2

    # Mid range pitch
    else:
        scores["neutral"] += 0.3
        scores["focused"] += 0.2

    # ZCR modifier: high ZCR = more consonants = more energetic speech
    if zcr > 0.15:
        scores["excited"]  += 0.1
        scores["stressed"] += 0.05

    # Pick winner
    best = max(scores, key=lambda k: scores[k])
    confidence = min(scores[best], 1.0)
    return best, confidence


def _neutral_features() -> dict:
    return {
        "pitch_hz":           0.0,
        "energy_rms":         0.0,
        "zcr":                0.0,
        "spectral_centroid":  0.0,
        "emotion":            "neutral",
        "confidence":         0.5,
    }


# Emotion → music parameter hints (used by useMoodFlow.ts context)
EMOTION_MUSIC_HINTS = {
    "excited":  {"energy": 0.9, "valence": 0.85, "genres": ["dance", "pop", "hip-hop"]},
    "stressed": {"energy": 0.3, "valence": 0.4,  "genres": ["ambient", "classical", "nature"]},
    "sad":      {"energy": 0.2, "valence": 0.15, "genres": ["indie", "acoustic", "soul"]},
    "focused":  {"energy": 0.5, "valence": 0.6,  "genres": ["lo-fi", "ambient", "minimal"]},
    "sleepy":   {"energy": 0.1, "valence": 0.5,  "genres": ["ambient", "sleep", "nature"]},
    "neutral":  {"energy": 0.5, "valence": 0.5,  "genres": []},
}
