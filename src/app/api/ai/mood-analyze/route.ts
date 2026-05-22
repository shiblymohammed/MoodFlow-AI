import { NextRequest, NextResponse } from 'next/server';
import { extractMood } from '@/lib/groq';

export async function POST(request: NextRequest) {
  try {
    const { input, history } = await request.json();
    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'Missing input' }, { status: 400 });
    }

    const mood = await extractMood(input, history ?? []);
    return NextResponse.json({ mood });
  } catch (err) {
    console.error('[mood-analyze]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
