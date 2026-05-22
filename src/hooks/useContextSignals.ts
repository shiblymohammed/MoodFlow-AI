'use client';
import { useState, useEffect, useCallback } from 'react';
import { fetchWeather, DEFAULT_COORDS, type WeatherData } from '@/lib/weather';
import { buildContextString, getTimeHint, type ContextSignals } from '@/lib/context-builder';
import { useAppStore } from '@/store/useAppStore';

export interface ContextState {
  weatherData: WeatherData | null;
  contextString: string;
  timeHint: string;
  isLoadingWeather: boolean;
  refreshWeather: () => void;
}

const WEATHER_CACHE_MS = 30 * 60 * 1000; // 30 minutes
let cachedWeather: { data: WeatherData; fetchedAt: number } | null = null;

export function useContextSignals(): ContextState {
  const { deviceId, currentMood, queue, detectedEmotion } = useAppStore();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  const loadWeather = useCallback(async () => {
    // Return cached if fresh
    if (cachedWeather && Date.now() - cachedWeather.fetchedAt < WEATHER_CACHE_MS) {
      setWeatherData(cachedWeather.data);
      return;
    }

    setIsLoadingWeather(true);
    try {
      const coords = await new Promise<{ lat: number; lon: number }>((resolve) => {
        if (!navigator.geolocation) {
          resolve(DEFAULT_COORDS);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          () => resolve(DEFAULT_COORDS), // graceful fallback
          { timeout: 5000 }
        );
      });

      const data = await fetchWeather(coords.lat, coords.lon);
      cachedWeather = { data, fetchedAt: Date.now() };
      setWeatherData(data);
    } catch {
      // Weather is non-critical — fail silently
    } finally {
      setIsLoadingWeather(false);
    }
  }, []);

  // Load weather once on mount
  useEffect(() => { loadWeather(); }, [loadWeather]);

  // Build context string from all signals
  const hour = new Date().getHours();
  const lastGenres = currentMood?.genres?.slice(0, 3);
  const lastMood = currentMood?.mood;

  // Include voice emotion if recently detected
  const emotionHint = detectedEmotion && detectedEmotion.emotion !== 'neutral'
    ? `The user's voice sounds ${detectedEmotion.emotion} (detected from tone).`
    : undefined;

  const signals: ContextSignals = {
    hour,
    weatherLabel: weatherData?.label,
    weatherEmoji: weatherData?.emoji,
    usingHeadphones: !!deviceId,
    lastGenres,
    lastMood,
  };

  const baseContext = buildContextString(signals);
  const contextString = emotionHint ? `${baseContext} ${emotionHint}` : baseContext;
  const timeHint = getTimeHint(hour);

  return {
    weatherData,
    contextString,
    timeHint,
    isLoadingWeather,
    refreshWeather: loadWeather,
  };
}
