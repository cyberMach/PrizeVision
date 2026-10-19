import * as ImageManipulator from 'expo-image-manipulator';
import { OCR_KEY } from './api';

export interface ParsedPlay {
  play: number;
  main: number[];
  bonus: number[];
}

export interface ParsedCoupon {
  plays: ParsedPlay[];
  drawDate: string | null;
  rawText: string;
}

// Compress image to under ~1MB for OCR.space free tier
export async function compressForOCR(uri: string): Promise<string> {
  for (const width of [1400, 1000, 700]) {
    const res = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width } }],
      { compress: 0.8, base64: true, format: ImageManipulator.SaveFormat.JPEG },
    );
    const b64 = res.base64 ?? '';
    if (b64.length < 1_000_000) return b64;
  }
  // Last resort
  const res = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 500 } }],
    { compress: 0.6, base64: true, format: ImageManipulator.SaveFormat.JPEG },
  );
  return res.base64 ?? '';
}

export async function runOCR(base64: string): Promise<string> {
  const formData = new FormData();
  formData.append('base64Image', `data:image/jpeg;base64,${base64}`);
  formData.append('apikey', OCR_KEY);
  formData.append('language', 'por');   // Portuguese for EuroMilhões coupons
  formData.append('isOverlayRequired', 'false');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2');    // Engine 2 handles mixed digits better

  const res = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData,
  });
  const json = await res.json();
  return json?.ParsedResults?.[0]?.ParsedText ?? '';
}

// Parse EuroMilhões coupon format:
//   1.N  02  17  24  32  46
//   E    02  06
//   2.N  04  13  19  33  34
//   E    08  11
export function parseCoupon(text: string): ParsedCoupon {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const plays: ParsedPlay[] = [];

  // Draw date: look for YYYY/MM/DD or YYYY-MM-DD at top of ticket
  let drawDate: string | null = null;
  const dateMatch = text.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
  if (dateMatch) {
    drawDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }

  let currentPlay: ParsedPlay | null = null;

  for (const line of lines) {
    // Main number line: starts with digit(s) followed by .N or N
    // e.g. "1.N 02 17 24 32 46" or "1N 2 17 24 32 46"
    const mainMatch = line.match(/^(\d+)[.\s]*N\s+([\d\s]+)/i);
    if (mainMatch) {
      if (currentPlay) plays.push(currentPlay);
      const playNum = parseInt(mainMatch[1], 10);
      const nums = extractNums(mainMatch[2], 1, 50, 5);
      currentPlay = { play: playNum, main: nums, bonus: [] };
      continue;
    }

    // Bonus line: starts with E
    // e.g. "E 02 06" or "E02 06"
    const bonusMatch = line.match(/^E\s*([\d\s]+)/i);
    if (bonusMatch && currentPlay) {
      currentPlay.bonus = extractNums(bonusMatch[1], 1, 12, 2);
      continue;
    }
  }

  if (currentPlay) plays.push(currentPlay);

  // Fallback: if no structured plays found, try flat number extraction
  if (plays.length === 0) {
    const allNums = extractNums(text, 1, 50, 5);
    if (allNums.length >= 5) {
      plays.push({ play: 1, main: allNums.slice(0, 5), bonus: allNums.slice(5, 7) });
    }
  }

  return { plays, drawDate, rawText: text };
}

function extractNums(text: string, min: number, max: number, limit: number): number[] {
  const matches = text.match(/\b\d{1,2}\b/g) ?? [];
  const nums = matches
    .map(Number)
    .filter((n) => n >= min && n <= max);
  return [...new Set(nums)].slice(0, limit);
}
