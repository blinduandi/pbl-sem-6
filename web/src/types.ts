export type DeviceStatus = 'online' | 'offline' | 'warning' | 'danger';
export type AlertType = 'humidity_high' | 'humidity_low' | 'gas_danger' | 'temp_high' | 'offline';
export type Severity = 'info' | 'warning' | 'danger';

export interface Device {
  id: string;
  name: string;
  location: string;
  status: DeviceStatus;
  firmware: string;
  lastSeen: string; // ISO
}

export interface Telemetry {
  deviceId: string;
  timestamp: string; // ISO
  humidity: number; // %RH
  temperature: number; // °C
  gas: number; // ppm-equivalent 0..10000
  fanOn: boolean;
  humidifierOn: boolean;
  alarmOn: boolean;
  wifiRssi: number; // dBm
}

export interface Thresholds {
  humidityHigh: number; // default 60
  humidityHighOff: number; // default 55
  humidityLow: number; // default 40
  humidityLowOff: number; // default 45
  gasDanger: number; // default 300
  gasDangerOff: number; // default 270
  tempHigh: number; // default 26
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
