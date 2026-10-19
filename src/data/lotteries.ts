export interface LotteryDef {
  id: number;
  label: string;
  country: string;
  mainCount: number;
  mainMax: number;
  bonusCount: number;
  bonusMax: number;
  magayoGame?: string;
}

export const SUPPORTED_LOTTERIES: LotteryDef[] = [
  {
    id: 728,
    label: 'EuroMillions',
    country: 'EU',
    mainCount: 5,
    mainMax: 50,
    bonusCount: 2,
    bonusMax: 12,
    magayoGame: 'euromillions',
  },
  {
    id: 1,
    label: 'EuroJackpot',
    country: 'EU',
    mainCount: 5,
    mainMax: 50,
    bonusCount: 2,
    bonusMax: 12,
    magayoGame: 'eurojackpot',
  },
  {
    id: 4,
    label: 'SuperEnalotto',
    country: 'EU',
    mainCount: 6,
    mainMax: 90,
    bonusCount: 1,
    bonusMax: 90,
    magayoGame: 'it_super',
  },
  {
    id: 3,
    label: 'Loto France',
    country: 'EU',
    mainCount: 5,
    mainMax: 49,
    bonusCount: 1,
    bonusMax: 10,
    magayoGame: 'fr_loto',
  },
];

export const DEFAULT_LOTTERY = SUPPORTED_LOTTERIES[0];
