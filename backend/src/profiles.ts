import type { Device } from './types.js';

/**
 * Per-device baseline + spike probabilities for the random walk.
 * Spike probabilities are evaluated each tick; when one fires, the device
 * is pushed into an abnormal regime for several seconds (humidity > 65 to
 * trigger the fan, or gas > 400 to trip the alarm).
 */
export interface DeviceProfile {
  device: Device;
  baseHumidity: number;
  baseTemperature: number;
  baseGas: number;
  spike: { humidity?: number; gas?: number };
}

const now = (): string => new Date().toISOString();

export const DEFAULT_PROFILES: DeviceProfile[] = [
  {
    device: {
      id: 'rm-living',
      name: 'Living Room',
      location: 'First floor — south wall',
      status: 'online',
      firmware: '1.0.3',
      lastSeen: now(),
    },
    baseHumidity: 50,
    baseTemperature: 22,
    baseGas: 120,
    spike: {},
  },
  {
    device: {
      id: 'rm-bedroom',
      name: 'Bedroom',
      location: 'Second floor — north wall',
      status: 'online',
      firmware: '1.0.3',
      lastSeen: now(),
    },
    baseHumidity: 52,
    baseTemperature: 21,
    baseGas: 100,
    spike: { humidity: 0.08 },
  },
  {
    device: {
      id: 'rm-basement',
      name: 'Basement',
      location: 'Below grade — utility room',
      status: 'online',
      firmware: '1.0.2',
      lastSeen: now(),
    },
    baseHumidity: 58,
    baseTemperature: 19,
    baseGas: 150,
    spike: { gas: 0.06 },
  },
];
