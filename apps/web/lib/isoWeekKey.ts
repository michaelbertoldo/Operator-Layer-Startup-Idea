/** ISO-8601 week key like "2026-W27". Used to bucket weekly budgets. */
export function isoWeekKey(d: Date): string {
  // Copy so we don't mutate the caller's date.
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Thursday of the current week decides the year (ISO rule).
  const day = date.getUTCDay() || 7; // Sun=0 -> 7
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
