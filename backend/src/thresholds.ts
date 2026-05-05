import type { Telemetry, Thresholds } from './types.js';

/**
 * Default thresholds, copied verbatim from the project report so the firmware
 * and the simulator never disagree about when a fan / alarm should engage.
 */
export const DEFAULT_THRESHOLDS: Thresholds = {
  humidityHigh: 60,
  humidityHighOff: 55,
  humidityLow: 40,
  humidityLowOff: 45,
  gasDanger: 300,
  gasDangerOff: 270,
  tempHigh: 30,
};

/**
 * Pure function that returns the next set of actuator states given the
 * current sensor reading and the previous actuator states. Hysteresis is
 * applied so values that hover around a setpoint do not cause flapping.
 *
 * Fan        : ON when RH > humidityHigh (60), OFF when RH < humidityHighOff (55)
 * Humidifier : ON when RH < humidityLow  (40), OFF when RH > humidityLowOff  (45)
 * Gas alarm  : ON when gas > gasDanger   (300), OFF when gas < gasDangerOff  (270)
 */
export function applyHysteresis(
  reading: Pick<Telemetry, 'humidity' | 'gas'>,
  prev: Pick<Telemetry, 'fanOn' | 'humidifierOn' | 'alarmOn'>,
  thresholds: Thresholds,
): { fanOn: boolean; humidifierOn: boolean; alarmOn: boolean } {
  let fanOn = prev.fanOn;
  if (reading.humidity > thresholds.humidityHigh) fanOn = true;
  else if (reading.humidity < thresholds.humidityHighOff) fanOn = false;

  let humidifierOn = prev.humidifierOn;
  if (reading.humidity < thresholds.humidityLow) humidifierOn = true;
  else if (reading.humidity > thresholds.humidityLowOff) humidifierOn = false;

  let alarmOn = prev.alarmOn;
  if (reading.gas > thresholds.gasDanger) alarmOn = true;
  else if (reading.gas < thresholds.gasDangerOff) alarmOn = false;

  // The fan and humidifier should never both be on. If the previous tick
  // somehow left them both on (e.g. thresholds were just updated), prefer
  // the action triggered by the more recent reading.
  if (fanOn && humidifierOn) {
    if (reading.humidity >= 50) humidifierOn = false;
    else fanOn = false;
  }

  return { fanOn, humidifierOn, alarmOn };
}

/**
 * Sanitise a partial thresholds patch from the network. Numeric fields
 * only, NaN rejected, unknown keys dropped.
 */
export function sanitiseThresholdPatch(input: unknown): Partial<Thresholds> {
  if (!input || typeof input !== 'object') return {};
  const allowed: (keyof Thresholds)[] = [
    'humidityHigh',
    'humidityHighOff',
    'humidityLow',
    'humidityLowOff',
    'gasDanger',
    'gasDangerOff',
    'tempHigh',
  ];
  const out: Partial<Thresholds> = {};
  const record = input as Record<string, unknown>;
  for (const key of allowed) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = value;
    }
  }
  return out;
}
