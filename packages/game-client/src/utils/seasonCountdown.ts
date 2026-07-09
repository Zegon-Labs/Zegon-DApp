export interface SeasonCountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export function seasonCountdownFromMs(msRemaining: number): SeasonCountdownParts {
  const totalMs = Math.max(0, msRemaining);
  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, totalMs };
}

export function padCountdownUnit(value: number): string {
  return String(value).padStart(2, "0");
}
