export type PoolType =
  | "single"
  | "double"
  | "nap"
  | "under3"
  | "under4"
  | "under5"
  | "under6";
export type OddsType = "standard" | "high";
export type BetType = "nap" | "perm";
export type Role = "admin" | "manager" | "agent" | "cashier";
export type FixtureStatus = "open" | "closed" | "postponed";
export type WeekStatus = "draft" | "open" | "closed" | "settled";

export const POOL_TYPES: PoolType[] = [
  "single",
  "double",
  "nap",
  "under3",
  "under4",
  "under5",
  "under6",
];
export const ODDS_TYPES: OddsType[] = ["standard", "high"];

export const DEFAULT_ODDS: Record<PoolType, Record<OddsType, number>> = {
  single: { standard: 10, high: 20 },
  double: { standard: 20, high: 40 },
  nap: { standard: 40, high: 80 },
  under3: { standard: 40, high: 80 },
  under4: { standard: 4, high: 8 },
  under5: { standard: 5, high: 10 },
  under6: { standard: 6, high: 12 },
};
