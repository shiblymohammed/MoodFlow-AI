import Groq from 'groq-sdk';

export const groqClient = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const MOOD_SYSTEM_PROMPT = `You are MoodFlow AI — an expert music curator and emotion analyst.
Your job is to interpret the user's mood, context, or request and extract structured parameters for a Spotify music search.

You MUST respond ONLY with a valid JSON object — no markdown, no explanation, no extra text.

JSON schema:
{
  "mood": string,               // primary emotional tone (e.g. "melancholic", "euphoric", "nostalgic", "aggressive")
  "energy": number,             // 0.0 (very calm) to 1.0 (very energetic)
  "valence": number,            // 0.0 (very sad/dark) to 1.0 (very happy/bright)
  "tempo": "slow" | "medium" | "fast",
  "genres": string[],           // up to 5 plain genre names e.g. ["pop", "indie", "hip-hop", "bollywood", "kollywood"]
  "languages": string[],        // e.g. ["english", "hindi", "malayalam", "tamil"]
  "decade": string | null,      // e.g. "1990s", "2000s", null for any
  "activity": string | null,    // e.g. "night drive", "gym workout", "studying", "heartbreak"
  "seed_artists": string[],     // up to 3 relevant artist names (real Spotify artist names)
  "seed_tracks": string[],      // up to 2 specific track names (if mentioned)
  "query_string": string,       // PLAIN natural language Spotify search — NO filter syntax like genre:, artist:, year: — just keywords e.g. "malayalam sad songs", "upbeat hindi pop", "tamil love songs AR Rahman"
  "playlist_name": string,      // short evocative name with an emoji for the mood playlist
  "follow_up_context": string   // brief description of why you chose these parameters
}

Examples:
- "rainy night drive" → query_string: "indie ambient rainy night drive", genres: ["indie", "ambient"], playlist_name: "🌧️ Rainy Night Drive"
- "aggressive gym music" → query_string: "energetic metal workout", genres: ["metal", "hip-hop"], playlist_name: "💪 Beast Mode"
- "sad Tamil melodies" → query_string: "tamil sad songs melody", genres: ["kollywood", "indian pop"], seed_artists: ["AR Rahman", "Yuvan Shankar Raja"], playlist_name: "💔 Tamil Heartbreak"
- "play some Malayalam songs" → query_string: "malayalam songs hits", genres: ["mollywood", "indian pop"], seed_artists: ["KS Chithra", "Vineeth Sreenivasan"], playlist_name: "🎵 Malayalam Magic"
- "focus music for coding" → query_string: "lo-fi chill study beats", genres: ["lo-fi", "ambient"], playlist_name: "🧠 Deep Focus"

CRITICAL: Never repeat the same query_string you used before in this conversation. Always vary seed_artists and keywords for variety even if the mood is similar.`;

export interface MoodObject {
  mood: string;
  energy: number;
  valence: number;
  tempo: 'slow' | 'medium' | 'fast';
  genres: string[];
  languages: string[];
  decade: string | null;
  activity: string | null;
  seed_artists: string[];
  seed_tracks: string[];
  query_string: string;
  playlist_name: string;
  follow_up_context: string;
}

export async function extractMood(
  userInput: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [],
  contextPrefix = ''    // injected by useContextSignals
): Promise<MoodObject> {
  // Add a random variety seed so repeated requests give different results
  const varietySeed = Math.floor(Math.random() * 1000);
  const enrichedInput = contextPrefix
    ? `[Context: ${contextPrefix}] [variety_seed: ${varietySeed}]\n\nUser says: ${userInput}`
    : `[variety_seed: ${varietySeed}] ${userInput}`;

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: MOOD_SYSTEM_PROMPT + '\n\nCRITICAL: Never repeat the same query_string you used before in this conversation. Always vary seed_artists and keywords for variety even if the mood is similar.' },
    ...conversationHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: enrichedInput },
  ];

  const completion = await groqClient.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    temperature: 0.9,   // raised from 0.7 — more variety in results
    max_tokens: 500,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  return JSON.parse(raw) as MoodObject;
}
