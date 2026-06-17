import { randomInt } from "node:crypto";

export function generateTicketCode(weekNumber: number): string {
  const date = new Date();
  const yy = String(date.getFullYear()).slice(2);
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const dd = String(dayOfYear).padStart(3, "0");
  const w = String(weekNumber).padStart(2, "0");
  const seq = String(randomInt(0, 100000)).padStart(5, "0");
  return `TX-${yy}${dd}${w}-${seq}`;
}
