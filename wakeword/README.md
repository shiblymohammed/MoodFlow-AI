# MoodFlow AI — Wake Word Sidecar

Python process that runs **OpenWakeWord** and signals the Next.js frontend when the wake word is detected.

## How it works

```
Microphone → OpenWakeWord (hey_jarvis) → WebSocket → Next.js → STT → Groq → Spotify
```

- Detects **"Hey Jarvis"** (built-in OpenWakeWord model, no training needed)
- Sends a JSON event via WebSocket on port `8765`
- Next.js receives the event and starts the voice pipeline automatically

## Setup

### 1. Create a virtual environment

```bash
cd wakeword
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

> **Note on PyAudio (Windows):** If `pip install pyaudio` fails, install it via:
> ```bash
> pip install pipwin
> pipwin install pyaudio
> ```

### 3. Run the sidecar

```bash
python main.py
```

You'll see:
```
12:00:00 [INFO] Loading model: hey_jarvis
12:00:02 [INFO] Model loaded ✓
12:00:02 [INFO] 🎙️  Listening for 'hey_jarvis'…  (threshold=0.5)
12:00:02 [INFO] WebSocket ready — open http://127.0.0.1:3000 in your browser
```

### 4. Run Next.js (separate terminal)

```bash
npm run dev
```

## Configuration

Edit the constants at the top of `main.py`:

| Variable | Default | Description |
|----------|---------|-------------|
| `WAKE_WORD_MODEL` | `"hey_jarvis"` | OpenWakeWord built-in model |
| `DETECTION_THRESHOLD` | `0.5` | Confidence threshold (0–1) |
| `COOLDOWN_SECONDS` | `3.0` | Re-arm delay after detection |
| `WS_PORT` | `8765` | WebSocket port |

## Available built-in models

- `hey_jarvis` ← we're using this
- `alexa`
- `hey_mycroft`
- `hey_rhasspy`
- `timer`
- `weather`

## Status indicator

The Next.js UI shows a **"Hey Jarvis"** pill in the header (cyan) when the sidecar is connected, or **"Wake word off"** (grey) when it's not running.
