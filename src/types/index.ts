export type TicketStatus = 'pending' | 'checked' | 'won' | 'expired';

export interface Ticket {
  id: string;
  lottery: string;
  lotteryId: number;
  mainBalls: number[];
  starBalls: number[];
  drawDate: string;
  status: TicketStatus;
  checkResult?: CheckResult | null;
  savedAt: string;
  isAIPick?: boolean;
}

export interface CheckResult {
  draws_checked: number;
  wins: number;
  total_prize: number;
  has_jackpot: boolean;
  results: DrawResult[];
  warning?: string | null;
}

export interface DrawResult {
  draw_date: string;
  prize?: { label: string };
}

export interface LotteryDraw {
  draw_date: string;
  balls: number[];
  ball_bonus: number[];
  jackpot: number;
  next_jackpot: number | null;
}

export interface AIGroup {
  id: number;
  label: string;
  description: string;
  mainBalls: number[];
  starBalls: number[];
  score: number;
  selected: boolean;
}
