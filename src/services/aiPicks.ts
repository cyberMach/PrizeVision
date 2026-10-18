import { LotteryDraw, AIGroup } from '../types';

const HIST_SCORES: Record<number, number> = {
  1:45,2:52,3:62,4:48,5:71,6:55,7:78,8:69,9:42,10:38,
  11:66,12:58,13:41,14:50,15:63,16:60,17:82,18:57,19:80,20:74,
  21:53,22:67,23:88,24:56,25:44,26:49,27:51,28:54,29:47,30:61,
  31:65,32:59,33:46,34:52,35:72,36:48,37:53,38:83,39:55,40:61,
  41:58,42:64,43:47,44:76,45:55,46:39,47:43,48:60,49:68,50:79,
};
const HIST_BONUS: Record<number, number> = {
  1:45,2:88,3:75,4:38,5:62,6:70,7:58,8:82,9:55,10:78,11:42,12:65,
};

function buildFrequencyMap(draws: LotteryDraw[]) {
  const freq: Record<number, number> = {};
  const bfreq: Record<number, number> = {};
  draws.forEach((d) => {
    d.balls.forEach((n) => { freq[n] = (freq[n] ?? 0) + 1; });
    d.ball_bonus.forEach((n) => { bfreq[n] = (bfreq[n] ?? 0) + 1; });
  });
  return { freq, bfreq };
}

function combinedScore(
  n: number,
  freq: Record<number, number>,
  total: number,
): number {
  const recentScore = ((freq[n] ?? 0) / Math.max(total, 1)) * 100;
  return Math.round(HIST_SCORES[n] * 0.7 + recentScore * 0.3);
}

function hasConsecutive(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  let count = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] === 1) count++;
  }
  return count;
}

function pickBalls(
  scores: Record<number, number>,
  max: number,
  count: number,
  exclude: number[] = [],
): number[] {
  return Object.entries(scores)
    .map(([k, v]) => ({ n: Number(k), s: v }))
    .filter((x) => x.n >= 1 && x.n <= max && !exclude.includes(x.n))
    .sort((a, b) => b.s - a.s)
    .slice(0, count * 4)
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map((x) => x.n)
    .sort((a, b) => a - b);
}

const DESCRIPTIONS = [
  'Sıcak Algoritma Varyantı',
  'Poisson Dağılım Modeli',
  'Kayıp Periyot Dengeleyici',
  'Sıcak & Soğuk Hibrit',
  'Kombinasyon Sapma Analizi',
];

export function generateAIGroups(draws: LotteryDraw[]): AIGroup[] {
  const { freq, bfreq } = buildFrequencyMap(draws);
  const total = draws.length;

  const mainScores: Record<number, number> = {};
  for (let i = 1; i <= 50; i++) mainScores[i] = combinedScore(i, freq, total);

  const bonusScores: Record<number, number> = {};
  for (let i = 1; i <= 12; i++) {
    bonusScores[i] = Math.round(HIST_BONUS[i] * 0.7 + ((bfreq[i] ?? 0) / Math.max(total, 1)) * 100 * 0.3);
  }

  const groups: AIGroup[] = [];

  for (let g = 0; g < 5; g++) {
    let balls: number[] = [];
    let attempts = 0;
    while (attempts < 20) {
      balls = pickBalls(mainScores, 50, 5);
      if (hasConsecutive(balls) <= 1) break;
      attempts++;
    }
    const stars = pickBalls(bonusScores, 12, 2);
    const score = Math.round(
      balls.reduce((s, n) => s + (mainScores[n] ?? 50), 0) / 5,
    );
    groups.push({
      id: g + 1,
      label: `Grup ${g + 1}`,
      description: DESCRIPTIONS[g],
      mainBalls: balls,
      starBalls: stars,
      score,
      selected: false,
    });
  }

  return groups;
}
