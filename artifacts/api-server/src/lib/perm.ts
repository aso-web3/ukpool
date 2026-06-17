/**
 * Pool betting math.
 */

import type { PoolType } from "./domain";

export function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;

  const kk = Math.min(k, n - k);
  let result = 1;

  for (let i = 1; i <= kk; i += 1) {
    result = (result * (n - kk + i)) / i;
  }

  return Math.round(result);
}

export function pickSizeForPool(poolType: PoolType): number {
  switch (poolType) {
    case "single":
      return 1;
    case "double":
      return 2;
    case "nap":
      return 3;
    case "under3":
      return 3;
    case "under4":
      return 4;
    case "under5":
      return 5;
    case "under6":
      return 6;
  }
}

export function totalLinesFor(
  betType: "nap" | "perm",
  poolType: PoolType,
  numPicks: number,
): number {
  if (poolType === "single") {
    return numPicks === 1 ? 1 : 0;
  }

  if (poolType === "double") {
    return numPicks === 2 ? 1 : 0;
  }

  if (betType === "nap") {
    if (poolType !== "nap") return 0;
    if (numPicks !== 3) return 0;
    return 1;
  }

  const k = pickSizeForPool(poolType);
  return combinations(numPicks, k);
}

export function winningLinesFor(
  betType: "nap" | "perm",
  poolType: PoolType,
  selectedNumbers: number[],
  winners: number[],
): number {
  const winSet = new Set(winners);
  const correct = selectedNumbers.filter((n) => winSet.has(n)).length;

  if (poolType === "single") {
    return correct === 1 ? 1 : 0;
  }

  if (poolType === "double") {
    return correct === 2 ? 1 : 0;
  }

  const k = pickSizeForPool(poolType);

  if (betType === "nap") {
    if (poolType !== "nap") return 0;
    if (selectedNumbers.length !== 3) return 0;
    return correct === 3 ? 1 : 0;
  }

  if (correct < k) return 0;

  return combinations(correct, k);
}

export function calcWinnings(
  winningLines: number,
  oddsValue: number,
  stake: number,
  totalLines: number,
): number {
  if (totalLines <= 0) return 0;
  if (winningLines <= 0) return 0;

  return (winningLines * oddsValue * stake) / totalLines;
}

export function validateSelection(
  betType: "nap" | "perm",
  poolType: PoolType,
  selectedNumbers: number[],
): string | null {
  const unique = new Set(selectedNumbers);

  if (unique.size !== selectedNumbers.length) {
    return "Duplicate numbers selected";
  }

  for (const n of selectedNumbers) {
    if (!Number.isInteger(n) || n < 1 || n > 49) {
      return `Invalid number ${n} (must be 1-49)`;
    }
  }

  if (poolType === "single") {
    if (selectedNumbers.length !== 1) {
      return "Single requires exactly 1 number";
    }
    return null;
  }

  if (poolType === "double") {
    if (selectedNumbers.length !== 2) {
      return "Double requires exactly 2 numbers";
    }
    return null;
  }

  if (betType === "nap") {
    if (poolType !== "nap") {
      return "NAP bets must use the NAP pool type";
    }

    if (selectedNumbers.length !== 3) {
      return "NAP bets require exactly 3 numbers";
    }

    return null;
  }

  if (poolType === "nap") {
    return "PERM bets must use an Under pool type";
  }

  const k = pickSizeForPool(poolType);

  if (selectedNumbers.length < k) {
    return `PERM ${poolType} requires at least ${k} numbers`;
  }

  if (selectedNumbers.length > 30) {
    return "Too many selections (max 30)";
  }

  return null;
}
