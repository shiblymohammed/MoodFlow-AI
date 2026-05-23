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
  | { type: 'specific_song';   query: string }
  | { type: 'more_like_this' }
  | { type: 'vibe_explain' }
  | { type: 'mood_change';     hint: string }
  | { type: 'mood_request' }

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
  /\b(different (mood|vibe|genre|style))\b/i,
];

const MORE_LIKE_THIS_PATTERNS = [
  /\b(more like (this|that)|similar (to this|songs?|vibes?))\b/i,
  /\b(keep (this|the) vibe|i (like|love) (this|it|this vibe|the vibe))\b/i,
  /\b(give me more (like this|of this)|more of (this|the same))\b/i,
  /\b(same (vibe|energy|mood|style))\b/i,
];

const VIBE_EXPLAIN_PATTERNS = [
  /\b(what('?s| is) (the )?(vibe|mood|genre|style|feeling|this))\b/i,
  /\b(why (this|these) songs?|explain (the )?(playlist|vibe|mood|choice))\b/i,
  /\b(what kind of (music|songs?|vibe) is (this|that))\b/i,
  /\b(tell me (about|more about) (this|the) (playlist|vibe|mood))\b/i,
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

  // 3. Pause
  if (matchesAny(t, PAUSE_PATTERNS) && !matchesAny(t, PLAY_PATTERNS)) {
    return { type: 'playback_control', action: 'pause' };
  }

  // 4. Previous
  if (matchesAny(t, PREVIOUS_PATTERNS)) {
    return { type: 'playback_control', action: 'previous' };
  }

  // 5. Play / Resume — only if short and no mood keywords
  if (matchesAny(t, PLAY_PATTERNS) && t.split(' ').length <= 3) {
    return { type: 'playback_control', action: 'play' };
  }

  // 6. Volume
  if (matchesAny(t, VOLUME_UP_PATTERNS))   return { type: 'volume', level: 'up' };
  if (matchesAny(t, VOLUME_DOWN_PATTERNS)) return { type: 'volume', level: 'down' };

  // 7. Specific song
  const songMatch = t.match(SPECIFIC_SONG_TRIGGERS);
  if (songMatch) {
    const query = songMatch[3].trim();
    if (!MOOD_WORDS.test(query) && query.split(' ').length <= 8) {
      return { type: 'specific_song', query };
    }
  }

  // 8. More like this
  if (matchesAny(t, MORE_LIKE_THIS_PATTERNS)) {
    return { type: 'more_like_this' };
  }

  // 9. Vibe explain
  if (matchesAny(t, VIBE_EXPLAIN_PATTERNS)) {
    return { type: 'vibe_explain' };
  }

  // 10. Mood change
  if (matchesAny(t, MOOD_CHANGE_PATTERNS)) {
    return { type: 'mood_change', hint: transcript };
  }

  // 11. Everything else → full mood request
  return { type: 'mood_request' };
}

/** Human-readable summary for debug/UI */
export function intentLabel(intent: VoiceIntent): string {
  switch (intent.type) {
    case 'playback_control': return `⏯ ${intent.action}`;
    case 'volume':           return `🔊 volume ${intent.level}`;
    case 'specific_song':    return `🔍 song: "${intent.query}"`;
    case 'more_like_this':   return '🔁 more like this';
    case 'vibe_explain':     return '🎧 explain vibe';
    case 'mood_change':      return '🎭 mood change';
    case 'mood_request':     return '🎵 new mood';
  }
}
