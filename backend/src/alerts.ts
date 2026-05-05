import type { AlertType, Thresholds } from './types.js';
import type { Store } from './store.js';

/**
 * Snapshot of the actuator + temperature state used to derive alerts.
 * `prev` holds last tick's actuator booleans; `next` holds this tick's.
 * `temperature` is the current sample (used for the simple temp_high check
 * which has no hysteresis since the spec did not define an off-threshold).
 */
export interface AlertContext {
  deviceId: string;
  prev: { fanOn: boolean; humidifierOn: boolean; alarmOn: boolean };
  next: { fanOn: boolean; humidifierOn: boolean; alarmOn: boolean };
  temperature: number;
  thresholds: Thresholds;
}

/**
 * Translate actuator transitions into alert events. Off→on raises an alert,
 * on→off resolves matching alerts of that type. The Store's hasUnresolved
 * is used for temp_high so we don't spam every tick the temp stays above.
 */
export function evaluateAlerts(store: Store, ctx: AlertContext): void {
  const { deviceId, prev, next, temperature, thresholds } = ctx;

  if (next.fanOn && !prev.fanOn) {
    store.pushAlert({
      deviceId,
      type: 'humidity_high',
      severity: 'warning',
      message: `Humidity above ${thresholds.humidityHigh}% — fan engaged`,
    });
  } else if (!next.fanOn && prev.fanOn) {
    store.resolveAlerts(deviceId, 'humidity_high');
  }

  if (next.humidifierOn && !prev.humidifierOn) {
    store.pushAlert({
      deviceId,
      type: 'humidity_low',
      severity: 'info',
      message: `Humidity below ${thresholds.humidityLow}% — humidifier engaged`,
    });
  } else if (!next.humidifierOn && prev.humidifierOn) {
    store.resolveAlerts(deviceId, 'humidity_low');
  }

  if (next.alarmOn && !prev.alarmOn) {
    store.pushAlert({
      deviceId,
      type: 'gas_danger',
      severity: 'danger',
      message: `Gas reading above ${thresholds.gasDanger} ppm — alarm tripped`,
    });
  } else if (!next.alarmOn && prev.alarmOn) {
    store.resolveAlerts(deviceId, 'gas_danger');
  }

  if (temperature > thresholds.tempHigh && !hasUnresolved(store, deviceId, 'temp_high')) {
    store.pushAlert({
      deviceId,
      type: 'temp_high',
      severity: 'warning',
      message: `Temperature above ${thresholds.tempHigh}°C`,
    });
  } else if (temperature <= thresholds.tempHigh) {
    store.resolveAlerts(deviceId, 'temp_high');
  }
}

function hasUnresolved(store: Store, deviceId: string, type: AlertType): boolean {
  return store
    .listAlerts()
    .some((a) => a.deviceId === deviceId && a.type === type && !a.resolved);
}
