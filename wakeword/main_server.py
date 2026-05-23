#!/usr/bin/env python3
"""
MoodFlow AI — VPS WebSocket Server
Receives raw PCM Int16 audio from the browser, runs openWakeWord detection,
sends WAKE_WORD_DETECTED events back.

No pyaudio required — runs on any Linux VPS.
Run: python main_server.py
"""

import asyncio
import json
import logging
import time
from collections import deque
from typing import Set

import numpy as np
import websockets
from openwakeword.model import Model

try:
    from emotion_analyzer import analyze_audio_chunk
    EMOTION_ENABLED = True
except Exception:
    EMOTION_ENABLED = False

# ── Config ───────────────────────────────────────────────────────────────────
HOST               = "0.0.0.0"
PORT               = 8766
WAKE_WORD_MODEL    = "hey_jarvis"
DETECTION_THRESHOLD = 0.5
COOLDOWN_SECONDS   = 3.0

SAMPLE_RATE        = 16000
CHUNK_SAMPLES      = 2048          # Int16 samples per chunk (power-of-2, matches browser ScriptProcessor)

# Keep ~2s of audio for emotion analysis
PRE_WAKE_CHUNKS    = int(2.0 * SAMPLE_RATE / CHUNK_SAMPLES)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("moodflow-vps")

# ── Load model once at startup ────────────────────────────────────────────────
log.info(f"Loading openWakeWord model: {WAKE_WORD_MODEL} …")
oww_model = Model(wakeword_models=[WAKE_WORD_MODEL], inference_framework="onnx")
log.info("Model loaded ✓")

connected_clients: Set[websockets.ServerConnection] = set()


async def handle_client(websocket: websockets.ServerConnection) -> None:
    connected_clients.add(websocket)
    client_addr = websocket.remote_address
    log.info(f"Client connected: {client_addr}  (total: {len(connected_clients)})")

    pre_buffer: deque[bytes] = deque(maxlen=PRE_WAKE_CHUNKS)
    last_detection = 0.0
    paused = False
    threshold = DETECTION_THRESHOLD  # per-client, adjustable via SET_THRESHOLD

    try:
        async for message in websocket:
            # ── Binary: raw PCM Int16 audio chunk from browser ──
            if isinstance(message, bytes):
                if paused:
                    continue

                pre_buffer.append(message)

                # Convert Int16 bytes → numpy array for openWakeWord
                audio = np.frombuffer(message, dtype=np.int16)

                # Run wake word prediction
                predictions = oww_model.predict(audio)

                now = time.time()
                for model_name, score in predictions.items():
                    if score >= threshold and (now - last_detection) > COOLDOWN_SECONDS:
                        last_detection = now
                        log.info(f"🔔 DETECTED! model={model_name} score={score:.3f} client={client_addr}")

                        # Emotion analysis from pre-wake buffer
                        emotion_data = {"emotion": "neutral", "confidence": 0.5, "pitch_hz": 0, "energy_rms": 0}
                        if EMOTION_ENABLED:
                            try:
                                pre_pcm = b"".join(pre_buffer)
                                emotion_data = analyze_audio_chunk(pre_pcm, SAMPLE_RATE)
                                log.info(f"🎭 Emotion: {emotion_data['emotion']} (conf={emotion_data['confidence']:.2f})")
                            except Exception as e:
                                log.debug(f"Emotion analysis error: {e}")

                        await websocket.send(json.dumps({
                            "type":      "WAKE_WORD_DETECTED",
                            "model":     model_name,
                            "score":     round(float(score), 3),
                            "timestamp": now,
                            "emotion":   emotion_data,
                        }))

            # ── Text: control commands ──
            elif isinstance(message, str):
                try:
                    msg = json.loads(message)
                    cmd = msg.get("type", "")
                    if cmd == "PAUSE_MIC":
                        paused = True
                        log.info(f"🔇 Mic paused for {client_addr}")
                    elif cmd == "RESUME_MIC":
                        paused = False
                        log.info(f"🎙️  Mic resumed for {client_addr}")
                    elif cmd == "SET_THRESHOLD":
                        new_val = float(msg.get("value", DETECTION_THRESHOLD))
                        new_val = max(0.1, min(0.99, new_val))  # clamp to safe range
                        threshold = new_val
                        log.info(f"🎚️  Threshold updated → {threshold:.2f} for {client_addr}")
                except Exception:
                    pass

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.discard(websocket)
        log.info(f"Client disconnected: {client_addr}  (total: {len(connected_clients)})")


async def main() -> None:
    log.info(f"Starting MoodFlow VPS WebSocket server on ws://{HOST}:{PORT}")
    log.info(f"Wake word: {WAKE_WORD_MODEL}  |  threshold: {DETECTION_THRESHOLD}")

    async with websockets.serve(
        handle_client,
        HOST,
        PORT,
        ping_interval=30,
        ping_timeout=10,
        max_size=64 * 1024,   # 64KB max message (PCM chunk is ~2.5KB)
    ):
        log.info("Server ready — waiting for browser connections…")
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log.info("\nStopped.")
