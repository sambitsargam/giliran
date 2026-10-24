export type BeadStatus = "paid" | "pending" | "overdue";

export type Bead = {
  address: string;
  label: string;
  emoji?: string;
  status: BeadStatus;
  isRecipient: boolean;
  isYou?: boolean;
  /** 1-based payout slot, if the order is drawn. */
  slot?: number;
  /** Already received a pot in an earlier round. */
  received?: boolean;
};

export type RoundClock = {
  now: number;
  start: number;
  deadline: number;
  graceEnd: number;
};
