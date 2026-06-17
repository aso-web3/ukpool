import { format } from "date-fns";

export function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return "";
  return format(new Date(dateString), "dd MMM yyyy, HH:mm");
}

export function formatShortDate(dateString: string): string {
  if (!dateString) return "";
  return format(new Date(dateString), "dd MMM yyyy");
}
