/**
 * Shared type contracts. Mirrors the web companion's data shape so
 * a future MQTT bridge can hydrate either client without translation.
 */

export type DeviceStatus = 'online' | 'offline' | 'warning' | 'danger';

export type AlertType =
  | 'humidity_high'
  | 'humidity_low'
  | 'gas_danger'
  | 'temp_high'
  | 'offline';

export type Severity = 'info' | 'warning' | 'danger';

export interface Device {
  id: string;
  name: string;
  location: string;
  status: DeviceStatus;
  firmware: string;
  lastSeen: string;
}

export interface Telemetry {
  deviceId: string;
  timestamp: string;
  humidity: number;
  temperature: number;
  gas: number;
  fanOn: boolean;
  humidifierOn: boolean;
  alarmOn: boolean;
  wifiRssi: number;
}

export interface Thresholds {
  humidityHigh: number;
  humidityHighOff: number;
  humidityLow: number;
  humidityLowOff: number;
  gasDanger: number;
  gasDangerOff: number;
  tempHigh: number;
}

export interface AlertEvent {
  id: string;
  deviceId: string;
  timestamp: string;
  type: AlertType;
  severity: Severity;
  message: string;
  resolved: boolean;
}
