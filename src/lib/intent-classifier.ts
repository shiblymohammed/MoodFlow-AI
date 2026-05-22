/**
 * Fast, regex-based voice intent classifier.
 * Runs client-side with zero latency — no API call needed for simple commands.
 *
 * Intent priority:
 *  1. Playback control  → next / pause / resume / previous / stop / volume
 *  2. Mood change       → "change this", "I don't like this", "something else"
 *  3. Mood request      → everything else → full AI pipeline
 */

export type PlaybackAction = 'next' | 'pause' | 'play' | 'previous' | 'stop';

export type VoiceIntent =
  | { type: 'playback_control'; action: PlaybackAction }
  | { type: 'volume';           level: 'up' | 'down' | number }
  | { type: 'specific_song';   query: string }   // exact song/artist search
  | { type: 'mood_change';     hint: string }     // re-run pipeline with user hint
  | { type: 'mood_request' }                      // full AI pipeline

// ── Pattern banks ────────────────────────────────────────────────────────────

const NEXT_PATTERNS = [
  /\b(next|skip|skip (this|song|track)|play next|next (song|track|one))\b/i,
  /\b(i (don'?t|do not) (like|want) (this|it))\b/i,
  /\b(not (this|it)|change (the )?(song|track))\b/i,
];

const PAUSE_PATTERNS = [
  /\b(pause|stop|hold on|wait|stop (the )?(music|song|playback))\b/i,
  /\b(mute|be quiet|shut up)\b/i,
];

const PLAY_PATTERNS = [
  /\b(play|resume|continue|unpause|start (the )?(music|song|playback))\b/i,
  /\b(keep (playing|going))\b/i,
];

const PREVIOUS_PATTERNS = [
  /\b(previous|go back|last (song|track)|play (the )?(previous|last)(one|song|track)?)\b/i,
  /\b(back|replay)\b/i,
];

const STOP_PATTERNS = [
  /\b(stop (everything|all)|that'?s (enough|all)|turn (it |the music )?off)\b/i,
];

const VOLUME_UP_PATTERNS   = [/\b(louder|volume up|turn (it |the volume )?(up|higher))\b/i];
const VOLUME_DOWN_PATTERNS = [/\b(quieter|softer|volume down|turn (it |the volume )?(down|lower))\b/i];

/**
 * Specific song/artist patterns — "play X by Y", "put on X", "I want to hear X"
 * We capture the query part (everything after the trigger word)
 */
const SPECIFIC_SONG_TRIGGERS = /^(play|put on|i want to (hear|listen to)|can you play|please play|queue)\s+(.+)$/i;

// If the phrase starts with "play" but also has mood words, treat as mood_request
const MOOD_WORDS = /\b(something|some|music|songs?|vibe|mood|playlist|genre|type|style|feel)\b/i;

const MOOD_CHANGE_PATTERNS = [
  /\b(change (the )?(mood|vibe|music|playlist|song))\b/i,
  /\b(something (else|different|new|other))\b/i,
  /\b(i('?m| am) (not|no longer) (feeling|in the mood for) (this|it))\b/i,
  /\b(switch (it up|the mood|the vibe))\b/i,
  /\b(different (mood|vibe|genre|genre|style))\b/i,
];

// ── Classifier ───────────────────────────────────────────────────────────────

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(text));
}

export function classifyIntent(transcript: string): VoiceIntent {
  const t = transcript.trim().toLowerCase();

  // 1. Next / Skip
  if (matchesAny(t, NEXT_PATTERNS)) {
    return { type: 'playback_control', action: 'next' };
  }

  // 2. Stop
  if (matchesAny(t, STOP_PATTERNS)) {
    return { type: 'playback_control', action: 'stop' };
  }

  // 3. Pause — check AFTER stop to avoid "stop the music" → pause instead of stop
  if (matchesAny(t, PAUSE_PATTERNS) && !matchesAny(t, PLAY_PATTERNS)) {
    return { type: 'playback_control', action: 'pause' };
  }

  // 5. Previous
  if (matchesAny(t, PREVIOUS_PATTERNS)) {
    return { type: 'playback_control', action: 'previous' };
  }

  // 6. Play / Resume — only if short and no mood keywords
  if (matchesAny(t, PLAY_PATTERNS) && t.split(' ').length <= 3) {
    return { type: 'playback_control', action: 'play' };
  }

  // 7. Volume
  if (matchesAny(t, VOLUME_UP_PATTERNS))   return { type: 'volume', level: 'up' };
  if (matchesAny(t, VOLUME_DOWN_PATTERNS)) return { type: 'volume', level: 'down' };

  // 8. Specific song — "play [name] by [artist]" / "put on [song]"
  const songMatch = t.match(SPECIFIC_SONG_TRIGGERS);
  if (songMatch) {
    const query = songMatch[3].trim();
    // If the query contains mood words → treat as mood_request instead
    if (!MOOD_WORDS.test(query) && query.split(' ').length <= 8) {
      return { type: 'specific_song', query };
    }
  }

  // 9. Mood change (re-run pipeline)
  if (matchesAny(t, MOOD_CHANGE_PATTERNS)) {
    return { type: 'mood_change', hint: transcript };
  }

  // 10. Everything else → full mood request
  return { type: 'mood_request' };
}

/** Human-readable summary for debug/UI */
export function intentLabel(intent: VoiceIntent): string {
  switch (intent.type) {
    case 'playback_control': return `⏯ ${intent.action}`;
    case 'volume':           return `🔊 volume ${intent.level}`;
    case 'specific_song':    return `🔍 song: "${intent.query}"`;
    case 'mood_change':      return '🎭 mood change';
    case 'mood_request':     return '🎵 new mood';
  }
}
