/**
 * Open-Meteo weather integration — no API key required.
 * https://open-meteo.com/en/docs
 */

export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy' | 'unknown';

export interface WeatherData {
  condition: WeatherCondition;
  temperatureCelsius: number;
  label: string;       // human-readable: "rainy and cool"
  emoji: string;
}

// WMO Weather interpretation codes → condition
function wmoToCondition(code: number): WeatherCondition {
  if (code === 0 || code === 1) return 'sunny';
  if (code <= 49) return 'cloudy';
  if (code <= 67) return 'rainy';
  if (code <= 77) return 'snowy';
  if (code <= 99) return 'stormy';
  return 'unknown';
}

const CONDITION_META: Record<WeatherCondition, { label: string; emoji: string }> = {
  sunny:   { label: 'sunny',   emoji: '☀️'  },
  cloudy:  { label: 'cloudy',  emoji: '☁️'  },
  rainy:   { label: 'rainy',   emoji: '🌧️' },
  snowy:   { label: 'snowy',   emoji: '❄️'  },
  stormy:  { label: 'stormy',  emoji: '⛈️'  },
  unknown: { label: 'unknown', emoji: '🌫️' },
};

export async function fetchWeather(
  lat: number,
  lon: number
): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    `&current=temperature_2m,weathercode` +
    `&temperature_unit=celsius` +
    `&timezone=auto`;

  const res = await fetch(url, { next: { revalidate: 1800 } }); // cache 30min
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);

  const data = await res.json();
  const code  = data.current.weathercode as number;
  const temp  = Math.round(data.current.temperature_2m as number);
  const condition = wmoToCondition(code);
  const meta = CONDITION_META[condition];

  const tempDesc = temp < 15 ? 'cold' : temp < 25 ? 'cool' : temp < 32 ? 'warm' : 'hot';

  return {
    condition,
    temperatureCelsius: temp,
    label: `${meta.label} and ${tempDesc}`,   // "rainy and cool"
    emoji: meta.emoji,
  };
}

/** Default coords for Bengaluru (fallback if geolocation denied) */
export const DEFAULT_COORDS = { lat: 12.9716, lon: 77.5946 };
