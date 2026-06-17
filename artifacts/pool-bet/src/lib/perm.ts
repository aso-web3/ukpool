export function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;

  k = Math.min(k, n - k);

  let c = 1;

  for (let i = 0; i < k; i++) {
    c = (c * (n - i)) / (i + 1);
  }

  return Math.round(c);
}

export function pickSizeForPool(poolType: string): number {
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
    default:
      return 3;
  }
}

export function validateSelection(
  poolType: string,
  selectedCount: number,
  betType: string = "perm",
): string | null {
  if (selectedCount > 30) {
    return "Maximum 30 selections allowed";
  }

  if (poolType === "single") {
    if (selectedCount !== 1) {
      return "Single requires exactly 1 selection";
    }
    return null;
  }

  if (poolType === "double") {
    if (selectedCount !== 2) {
      return "Double requires exactly 2 selections";
    }
    return null;
  }

  if (betType === "nap" || poolType === "nap") {
    if (poolType !== "nap") {
      return "NAP bets must use the NAP pool";
    }

    if (betType !== "nap") {
      return "NAP pool requires bet type NAP";
    }

    if (selectedCount !== 3) {
      return "NAP requires exactly 3 selections";
    }

    return null;
  }

  const minRequired = pickSizeForPool(poolType);

  if (selectedCount < minRequired) {
    return `Minimum ${minRequired} selections required for ${poolType.toUpperCase()}`;
  }

  return null;
}
