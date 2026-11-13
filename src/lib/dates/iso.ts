// Dates ISO « AAAA-MM-JJ » ↔ millisecondes UTC (minuit).

export const JOUR_MS = 86_400_000;

export function versUtc(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function versIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
