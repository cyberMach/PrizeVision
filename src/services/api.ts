import { LotteryDraw, CheckResult } from '../types';

const BASE_URL = process.env.EXPO_PUBLIC_LOTTERY_BASE_URL ?? '';
const API_KEY = process.env.EXPO_PUBLIC_LOTTERY_API_KEY ?? '';
export const OCR_KEY = process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY ?? '';
const MAGAYO_KEY = process.env.EXPO_PUBLIC_MAGAYO_API_KEY ?? '';

const jackpotCache = new Map<string, { value: number; ts: number }>();
const JACKPOT_TTL = 30 * 60 * 1000;

export async function fetchJackpot(game: string): Promise<number | null> {
  const cached = jackpotCache.get(game);
  if (cached && Date.now() - cached.ts < JACKPOT_TTL) return cached.value;
  try {
    const res = await fetch(
      `https://www.magayo.com/api/jackpot.php?api_key=${MAGAYO_KEY}&game=${game}`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    const value = Number(json.jackpot);
    if (!isNaN(value) && value > 0) {
      jackpotCache.set(game, { value, ts: Date.now() });
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

const headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: `Bearer ${API_KEY}`,
};

const drawsCache = new Map<string, { data: LotteryDraw[]; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000;

export async function fetchLatestDraws(
  lotteryId: number,
  limit = 50,
): Promise<LotteryDraw[]> {
  const key = `${lotteryId}:${limit}`;
  const cached = drawsCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const res = await fetch(
    `${BASE_URL}/lottery/results?id=${lotteryId}&limit=${limit}`,
    { headers },
  );
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json = await res.json();
  const data: LotteryDraw[] = json.results ?? [];
  drawsCache.set(key, { data, ts: Date.now() });
  return data;
}

export async function checkTicket(params: {
  lotteryId: number;
  balls: number[];
  bonus: number[];
  range?: string;
}): Promise<CheckResult> {
  const res = await fetch(`${BASE_URL}/lottery/check`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: params.lotteryId,
      balls: params.balls,
      bonus: params.bonus,
      range: params.range ?? 'last_draw',
    }),
  });
  if (!res.ok) throw new Error(`Check API ${res.status}`);
  const json = await res.json();
  return json.check as CheckResult;
}

export async function runOCR(base64Image: string): Promise<string> {
  const formData = new FormData();
  formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
  formData.append('apikey', OCR_KEY);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');

  const res = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData,
  });
  const json = await res.json();
  return json?.ParsedResults?.[0]?.ParsedText ?? '';
}
