import type { Store } from './store.js';
import type { PartialTelemetry, Telemetry } from './types.js';

/**
 * Result of attempting to validate + merge an inbound ingest payload.
 * On success, the merged Telemetry is ready to hand to
 * `store.applyLiveTelemetry`. On failure, `error` describes why.
 */
export type IngestResult =
  | { ok: true; reading: Telemetry }
  | { ok: false; error: string };

const isString = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0;
const isFiniteNum = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';

/**
 * Validate a partial telemetry payload from the bridge / external caller
 * and merge it with the latest known reading for that device. Missing
 * scalar fields fall back to the previous value (or sensible defaults
 * if there is no previous reading at all).
 *
 * Rejects when:
 *   - payload is not an object
 *   - deviceId is missing or non-string
 *   - deviceId does not match a known device in the Store
 */
export function validateAndMergeIngest(
  store: Store,
  payload: PartialTelemetry,
): IngestResult {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'payload_not_object' };
  }
  const deviceId = payload.deviceId;
  if (!isString(deviceId)) {
    return { ok: false, error: 'missing_deviceId' };
  }
  if (!store.getDevice(deviceId)) {
    return { ok: false, error: 'unknown_device' };
  }

  const prev = store.getLatest(deviceId);
  const num = (key: keyof Telemetry, fallback: number): number => {
    const v = payload[key as string];
    if (isFiniteNum(v)) return v;
    const prevVal = prev?.[key];
    return typeof prevVal === 'number' ? prevVal : fallback;
  };
  const bool = (key: keyof Telemetry, fallback: boolean): boolean => {
    const v = payload[key as string];
    if (isBool(v)) return v;
    const prevVal = prev?.[key];
    return typeof prevVal === 'boolean' ? prevVal : fallback;
  };

  const timestamp = isString(payload.timestamp)
    ? payload.timestamp
    : new Date().toISOString();

  const reading: Telemetry = {
    deviceId,
    timestamp,
    humidity: num('humidity', 0),
    temperature: num('temperature', 0),
    gas: num('gas', 0),
    fanOn: bool('fanOn', false),
    humidifierOn: bool('humidifierOn', false),
    alarmOn: bool('alarmOn', false),
    wifiRssi: num('wifiRssi', -55),
  };

  return { ok: true, reading };
}
