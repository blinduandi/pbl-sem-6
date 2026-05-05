/**
 * Tiny formatting helpers — kept dependency-free so the app
 * never has to ship a date library.
 */

export const formatNumber = (value: number, digits = 1): string => {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(digits);
};

export const formatPercent = (value: number): string => `${formatNumber(value, 0)}%`;

export const formatTemperature = (value: number): string => `${formatNumber(value, 1)}°C`;

export const formatGas = (value: number): string => `${formatNumber(value, 0)} ppm`;

export const formatRssi = (value: number): string => `${Math.round(value)} dBm`;

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const formatRelativeTime = (iso: string, now = Date.now()): string => {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const delta = Math.max(0, now - t);
  if (delta < 5 * SECOND) return 'just now';
  if (delta < MINUTE) return `${Math.round(delta / SECOND)}s ago`;
  if (delta < HOUR) return `${Math.round(delta / MINUTE)}m ago`;
  if (delta < DAY) return `${Math.round(delta / HOUR)}h ago`;
  return `${Math.round(delta / DAY)}d ago`;
};

export const padId = (id: string): string => id.toUpperCase();
