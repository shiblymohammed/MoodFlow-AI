#!/usr/bin/env python3
"""
MoodFlow AI — OpenWakeWord Sidecar
Listens for the wake word and notifies the Next.js frontend via WebSocket.
Supports PAUSE_MIC / RESUME_MIC commands from the browser to avoid mic conflicts.
"""

import asyncio
import json
import logging
import time
from typing import Set

import numpy as np
import pyaudio
import websockets
from openwakeword.model import Model

# ── Config ──────────────────────────────────────────────────────────────────
WS_HOST = "127.0.0.1"
WS_PORT = 8765
WAKE_WORD_MODEL = "hey_jarvis"
DETECTION_THRESHOLD = 0.5
COOLDOWN_SECONDS = 3.0

SAMPLE_RATE = 16000
CHUNK_SIZE = 1280
FORMAT = pyaudio.paInt16
CHANNELS = 1

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("moodflow-wakeword")

# ── Shared state ─────────────────────────────────────────────────────────────
connected_clients: Set[websockets.ServerConnection] = set()
mic_paused = False          # when True, skip inference (browser STT is active)


async def ws_handler(websocket: websockets.ServerConnection) -> None:
    """Accept, track, and handle commands from browser clients."""
    global mic_paused
    connected_clients.add(websocket)
    log.info(f"Browser connected ({len(connected_clients)} client(s))")
    try:
        async for raw in websocket:
            try:
                msg = json.loads(raw)
                cmd = msg.get("type", "")
                if cmd == "PAUSE_MIC":
                    mic_paused = True
                    log.info("🔇 Mic paused (browser STT active)")
                elif cmd == "RESUME_MIC":
                    mic_paused = False
                    log.info("🎙️  Mic resumed")
            except Exception:
                pass
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.discard(websocket)
        log.info(f"Browser disconnected ({len(connected_clients)} client(s))")


async def broadcast(event: dict) -> None:
    if not connected_clients:
        return
    message = json.dumps(event)
    await asyncio.gather(
        *[client.send(message) for client in connected_clients],
        return_exceptions=True,
    )


def run_detection(loop: asyncio.AbstractEventLoop) -> None:
    """Blocking mic + inference loop — runs in a thread."""
    global mic_paused
    log.info(f"Loading model: {WAKE_WORD_MODEL} …")
    oww = Model(wakeword_models=[WAKE_WORD_MODEL], inference_framework="onnx")
    log.info("Model loaded ✓")

    pa = pyaudio.PyAudio()
    stream = pa.open(
        rate=SAMPLE_RATE,
        channels=CHANNELS,
        format=FORMAT,
        input=True,
        frames_per_buffer=CHUNK_SIZE,
    )

    log.info(f'🎙️  Listening for "{WAKE_WORD_MODEL}"…  (threshold={DETECTION_THRESHOLD})')
    last_detection = 0.0

    try:
        while True:
            raw = stream.read(CHUNK_SIZE, exception_on_overflow=False)

            # Skip inference when browser STT is using the mic
            if mic_paused:
                time.sleep(0.05)
                continue

            audio = np.frombuffer(raw, dtype=np.int16)
            prediction = oww.predict(audio)

            for model_name, score in prediction.items():
                now = time.time()
                if score >= DETECTION_THRESHOLD and (now - last_detection) > COOLDOWN_SECONDS:
                    last_detection = now
                    log.info(f"🔔 DETECTED! model={model_name} score={score:.3f}")
                    asyncio.run_coroutine_threadsafe(
                        broadcast({
                            "type": "WAKE_WORD_DETECTED",
                            "model": model_name,
                            "score": round(float(score), 3),
                            "timestamp": now,
                        }),
                        loop,
                    )
    finally:
        stream.stop_stream()
        stream.close()
        pa.terminate()


async def main() -> None:
    loop = asyncio.get_running_loop()
    log.info(f"Starting WebSocket server on ws://{WS_HOST}:{WS_PORT}")
    async with websockets.serve(ws_handler, WS_HOST, WS_PORT):
        log.info("WebSocket ready ✓ — open http://127.0.0.1:3000")
        log.info("Press Ctrl+C to stop\n")
        await loop.run_in_executor(None, run_detection, loop)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log.info("\nStopped.")
