import type { Telemetry, Thresholds } from '../types';

/**
 * Hysteresis-based actuator policy — matches the firmware running on
 * the ESP32. The deadband prevents fast toggling near the setpoint.
 */
export const DEFAULT_THRESHOLDS: Thresholds = {
  humidityHigh: 60,
  humidityHighOff: 55,
  humidityLow: 40,
  humidityLowOff: 45,
  gasDanger: 300,
  gasDangerOff: 270,
  tempHigh: 28,
};

export interface ActuatorState {
  fanOn: boolean;
  humidifierOn: boolean;
  alarmOn: boolean;
}

export const applyHysteresis = (
  prev: ActuatorState,
  reading: Pick<Telemetry, 'humidity' | 'gas'>,
  th: Thresholds,
): ActuatorState => {
  let fanOn = prev.fanOn;
  if (reading.humidity > th.humidityHigh) fanOn = true;
  else if (reading.humidity < th.humidityHighOff) fanOn = false;

  let humidifierOn = prev.humidifierOn;
  if (reading.humidity < th.humidityLow) humidifierOn = true;
  else if (reading.humidity > th.humidityLowOff) humidifierOn = false;

  let alarmOn = prev.alarmOn;
  if (reading.gas > th.gasDanger) alarmOn = true;
  else if (reading.gas < th.gasDangerOff) alarmOn = false;

  return { fanOn, humidifierOn, alarmOn };
};

export const clampThresholds = (t: Thresholds): Thresholds => ({
  humidityHigh: Math.max(t.humidityHighOff + 1, Math.min(95, t.humidityHigh)),
  humidityHighOff: Math.max(0, Math.min(t.humidityHigh - 1, t.humidityHighOff)),
  humidityLow: Math.max(0, Math.min(t.humidityLowOff - 1, t.humidityLow)),
  humidityLowOff: Math.max(t.humidityLow + 1, Math.min(95, t.humidityLowOff)),
  gasDanger: Math.max(t.gasDangerOff + 1, Math.min(2000, t.gasDanger)),
  gasDangerOff: Math.max(0, Math.min(t.gasDanger - 1, t.gasDangerOff)),
  tempHigh: Math.max(20, Math.min(45, t.tempHigh)),
});
