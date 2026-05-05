import type { Telemetry, Thresholds } from '../types';

export const DEFAULT_THRESHOLDS: Thresholds = {
  humidityHigh: 60,
  humidityHighOff: 55,
  humidityLow: 40,
  humidityLowOff: 45,
  gasDanger: 300,
  gasDangerOff: 270,
  tempHigh: 26,
};

export interface ActuatorState {
  fanOn: boolean;
  humidifierOn: boolean;
  alarmOn: boolean;
}

/**
 * Apply hysteresis to determine actuator state.
 *
 * Fan: turns ON when humidity rises above humidityHigh, turns OFF when it
 *      falls below humidityHighOff (or when gas is dangerous — fan helps clear it).
 * Humidifier: turns ON when humidity falls below humidityLow, turns OFF when it
 *      rises above humidityLowOff.
 * Alarm: turns ON when gas exceeds gasDanger or temp exceeds tempHigh, turns OFF
 *      when gas falls below gasDangerOff and temp <= tempHigh.
 */
export function applyHysteresis(
  reading: Pick<Telemetry, 'humidity' | 'temperature' | 'gas'>,
  prev: ActuatorState,
  t: Thresholds,
): ActuatorState {
  // Humidifier — low humidity
  let humidifierOn = prev.humidifierOn;
  if (!humidifierOn && reading.humidity < t.humidityLow) humidifierOn = true;
  else if (humidifierOn && reading.humidity > t.humidityLowOff) humidifierOn = false;

  // Fan — high humidity (or gas danger forces extraction)
  let fanOn = prev.fanOn;
  const gasForcesFan = reading.gas > t.gasDanger;
  if (!fanOn && reading.humidity > t.humidityHigh) fanOn = true;
  else if (fanOn && reading.humidity < t.humidityHighOff && !gasForcesFan) fanOn = false;
  if (gasForcesFan) fanOn = true;

  // Alarm — gas or temp
  let alarmOn = prev.alarmOn;
  const gasDanger = reading.gas > t.gasDanger;
  const tempDanger = reading.temperature > t.tempHigh;
  if (!alarmOn && (gasDanger || tempDanger)) alarmOn = true;
  else if (alarmOn && reading.gas < t.gasDangerOff && reading.temperature <= t.tempHigh) {
    alarmOn = false;
  }

  // Don't let humidifier and fan run simultaneously — fan wins.
  if (fanOn && humidifierOn) humidifierOn = false;

  return { fanOn, humidifierOn, alarmOn };
}
