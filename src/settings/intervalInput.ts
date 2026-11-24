export const MIN_PERIODIC_INTERVAL_MINUTES = 1;
export const MAX_PERIODIC_INTERVAL_MINUTES = 1440;

export function parsePeriodicIntervalMinutes(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) {
    return null;
  }
  const value = Number(text);
  if (
    !Number.isInteger(value) ||
    value < MIN_PERIODIC_INTERVAL_MINUTES ||
    value > MAX_PERIODIC_INTERVAL_MINUTES
  ) {
    return null;
  }
  return value;
}

export function applyPeriodicInterval(options: {
  raw: string;
  current: number;
  startTimer: (minutes: number) => void;
}): string | null {
  const next = parsePeriodicIntervalMinutes(options.raw);
  if (next === null) {
    return `Enter a whole number of minutes from ${MIN_PERIODIC_INTERVAL_MINUTES} to ${MAX_PERIODIC_INTERVAL_MINUTES}.`;
  }
  if (next !== options.current) {
    options.startTimer(next);
  }
  return null;
}
