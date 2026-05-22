/**
 * Builds a natural-language context prefix injected into every Groq mood prompt.
 * Example output:
 *   "It is currently late night (23:15). The weather is rainy and cool 🌧️.
 *    The user is likely using headphones. Previously enjoyed: lo-fi, ambient."
 */

export interface ContextSignals {
  hour: number;                 // 0-23
  weatherLabel?: string;        // "rainy and cool"
  weatherEmoji?: string;        // "🌧️"
  activity?: string;            // inferred from last user phrase
  usingHeadphones: boolean;
  lastGenres?: string[];        // from memory store
  lastMood?: string;            // last detected mood
}

function getTimeOfDay(hour: number): string {
  if (hour >= 5  && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  if (hour >= 21 && hour < 24) return 'late night';
  return 'midnight';
}

function inferActivity(lastPhrase: string): string | undefined {
  const p = lastPhrase.toLowerCase();
  if (/gym|workout|exercise|lift|run/.test(p)) return 'working out';
  if (/cod(e|ing)|program|work|study|focus/.test(p)) return 'coding or studying';
  if (/driv|car|road|commut/.test(p)) return 'driving';
  if (/sleep|bed|rest|relax/.test(p)) return 'winding down for sleep';
  if (/cook|eat|dinner|lunch|breakfast/.test(p)) return 'cooking or eating';
  if (/party|celebrat|dance/.test(p)) return 'at a party or celebrating';
  return undefined;
}

export function buildContextString(signals: ContextSignals, lastUserPhrase = ''): string {
  const parts: string[] = [];

  // Time
  const timeOfDay = getTimeOfDay(signals.hour);
  parts.push(`It is currently ${timeOfDay} (${String(signals.hour).padStart(2, '0')}:00).`);

  // Weather
  if (signals.weatherLabel && signals.weatherEmoji) {
    parts.push(`The weather is ${signals.weatherLabel} ${signals.weatherEmoji}.`);
  }

  // Device
  if (signals.usingHeadphones) {
    parts.push(`The user is using headphones.`);
  }

  // Activity (inferred or explicit)
  const activity = signals.activity ?? inferActivity(lastUserPhrase);
  if (activity) {
    parts.push(`The user appears to be ${activity}.`);
  }

  // Memory
  if (signals.lastGenres?.length) {
    parts.push(`Recently enjoyed genres: ${signals.lastGenres.slice(0, 3).join(', ')}.`);
  }
  if (signals.lastMood) {
    parts.push(`Last detected mood: ${signals.lastMood}.`);
  }

  return parts.join(' ');
}

/**
 * Maps time of day → music characteristics hint for the Groq prompt.
 * Guides the AI without hard-coding the playlist choice.
 */
export function getTimeHint(hour: number): string {
  if (hour >= 22 || hour < 4)  return 'Consider calm, low-energy music appropriate for late night.';
  if (hour >= 4  && hour < 7)  return 'Consider gentle, awakening music for early morning.';
  if (hour >= 7  && hour < 12) return 'Consider upbeat, energizing music for morning.';
  if (hour >= 12 && hour < 14) return 'Consider moderate energy music for midday.';
  if (hour >= 17 && hour < 20) return 'Consider relaxing, evening wind-down music.';
  return '';
}
