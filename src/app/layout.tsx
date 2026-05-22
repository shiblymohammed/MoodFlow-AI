import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MoodFlow AI — Your AI Music Companion',
  description:
    'An AI-powered voice assistant that reads your mood and curates the perfect Spotify playlist. Just say what you feel.',
  keywords: ['spotify', 'AI music', 'mood music', 'voice assistant', 'playlist'],
  openGraph: {
    title: 'MoodFlow AI',
    description: 'Tell your AI DJ how you feel. Music follows.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
