'use client';
import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

/**
 * Extracts the dominant color from the current track's album art using a <canvas>.
 * Stores result in store.dominantColor as an HSL string.
 */
export function useDominantColor() {
  const { currentTrack, setDominantColor } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const imgUrl = currentTrack?.album?.images?.[1]?.url  // 300×300
                ?? currentTrack?.album?.images?.[0]?.url;

    if (!imgUrl) { setDominantColor(null); return; }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imgUrl;

    img.onload = () => {
      const size = 24; // sample at small size for speed
      if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
      const canvas = canvasRef.current;
      canvas.width = canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;

      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        // Skip very dark or very light pixels (they're usually borders)
        const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
        if (brightness < 20 || brightness > 235) continue;
        r += data[i]; g += data[i+1]; b += data[i+2];
        count++;
      }
      if (count === 0) { setDominantColor(null); return; }

      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);

      // Convert to HSL and force vivid saturation for ambient glow
      const [h, s, l] = rgbToHsl(r, g, b);
      // Clamp lightness so it's always a visible mid-tone glow
      setDominantColor(`hsl(${Math.round(h)}, ${Math.max(s, 55)}%, ${Math.min(Math.max(l, 30), 55)}%)`);
    };

    img.onerror = () => setDominantColor(null);
  }, [currentTrack?.id, setDominantColor]);
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}
