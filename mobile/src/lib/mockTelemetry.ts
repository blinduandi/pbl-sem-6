import { useEffect, useState } from 'react';
import type {
  AlertEvent,
  AlertType,
  Device,
  DeviceStatus,
  Severity,
  Telemetry,
  Thresholds,
} from '../types';
import { applyHysteresis, clampThresholds, DEFAULT_THRESHOLDS } from './thresholds';

/**
 * In-memory telemetry simulator.
 *
 * Stands in for an MQTT broker until the ESP32 firmware is hooked up. Three
 * devices random-walk around comfortable indoor baselines, periodic events
 * push readings outside the thresholds, and the same hysteresis logic the
 * firmware uses decides actuator state. Everything runs on a single 2 s
 * tick driven by `setInterval`.
 */

const HISTORY_LIMIT = 60;
const TICK_MS = 2000;
const LIVE_TTL_MS = 10_000;

interface DeviceProfile {
  device: Device;
  baseline: { humidity: number; temperature: number; gas: number };
  noise: { humidity: number; temperature: number; gas: number };
  history: Telemetry[];
  actuators: { fanOn: boolean; humidifierOn: boolean; alarmOn: boolean };
  injection: {
    type: 'none' | 'humidity_high' | 'gas_danger';
    until: number;
  };
}

type Listener = () => void;

const isoNow = (): string => new Date().toISOString();

const randomWalk = (current: number, target: number, noise: number, drift = 0.08): number => {
  const towardTarget = (target - current) * drift;
  const jitter = (Math.random() - 0.5) * noise;
  return current + towardTarget + jitter;
};

const initialDevices: DeviceProfile[] = [
  {
    device: {
      id: 'rm-living',
      name: 'Living Room',
      location: 'Ground floor · north wall',
      status: 'online',
      firmware: '1.4.2',
      lastSeen: isoNow(),
    },
    baseline: { humidity: 48, temperature: 22.5, gas: 110 },
    noise: { humidity: 1.2, temperature: 0.25, gas: 14 },
    history: [],
    actuators: { fanOn: false, humidifierOn: false, alarmOn: false },
    injection: { type: 'none', until: 0 },
  },
  {
    device: {
      id: 'rm-bedroom',
      name: 'Bedroom',
      location: 'First floor · west wall',
      status: 'online',
      firmware: '1.4.2',
      lastSeen: isoNow(),
    },
    baseline: { humidity: 51, temperature: 21.8, gas: 95 },
    noise: { humidity: 1.4, temperature: 0.22, gas: 11 },
    history: [],
    actuators: { fanOn: false, humidifierOn: false, alarmOn: false },
    injection: { type: 'none', until: 0 },
  },
  {
    device: {
      id: 'rm-basement',
      name: 'Basement',
      location: 'Below grade · utility',
      status: 'online',
      firmware: '1.3.9',
      lastSeen: isoNow(),
    },
    baseline: { humidity: 54, temperature: 19.4, gas: 130 },
    noise: { humidity: 1.6, temperature: 0.18, gas: 22 },
    history: [],
    actuators: { fanOn: false, humidifierOn: false, alarmOn: false },
    injection: { type: 'none', until: 0 },
  },
];

const ALERT_MESSAGES: Record<AlertType, string> = {
  humidity_high: 'Humidity above comfort band — venting fan engaged.',
  humidity_low: 'Humidity below comfort band — humidifier engaged.',
  gas_danger: 'Combustible gas exceeded safety threshold.',
  temp_high: 'Temperature above the configured ceiling.',
  offline: 'Device stopped reporting telemetry.',
};

const ALERT_SEVERITY: Record<AlertType, Severity> = {
  humidity_high: 'warning',
  humidity_low: 'info',
  gas_danger: 'danger',
  temp_high: 'warning',
  offline: 'danger',
};

class TelemetryStore {
  private devices: DeviceProfile[];
  private alerts: AlertEvent[] = [];
  private thresholds: Thresholds = { ...DEFAULT_THRESHOLDS };
  private listeners = new Set<Listener>();
  private liveListeners = new Set<Listener>();
  // Devices currently fed by the backend WS bridge. Value is the epoch ms
  // up to which this device is considered "live".
  private liveUntil = new Map<string, number>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextEventAt: number;
  private alertSeq = 0;

  constructor(devices: DeviceProfile[]) {
    this.devices = devices;
    this.nextEventAt = Date.now() + this.randomEventDelay();
    devices.forEach((d) => {
      const seedReading = this.makeReading(d, d.baseline.humidity, d.baseline.temperature, d.baseline.gas);
      d.history.push(seedReading);
    });
    this.start();
  }

  private randomEventDelay(): number {
    return 30_000 + Math.floor(Math.random() * 30_000);
  }

  private makeReading(d: DeviceProfile, humidity: number, temperature: number, gas: number): Telemetry {
    return {
      deviceId: d.device.id,
      timestamp: isoNow(),
      humidity,
      temperature,
      gas,
      fanOn: d.actuators.fanOn,
      humidifierOn: d.actuators.humidifierOn,
      alarmOn: d.actuators.alarmOn,
      wifiRssi: -52 - Math.floor(Math.random() * 14),
    };
  }

  start(): void {
    if (this.timer != null) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  stop(): void {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  private notifyLive(): void {
    this.liveListeners.forEach((l) => l());
  }

  subscribeLive(listener: Listener): () => void {
    this.liveListeners.add(listener);
    return () => {
      this.liveListeners.delete(listener);
    };
  }

  private maybeInjectEvent(now: number): void {
    if (now < this.nextEventAt) return;
    this.nextEventAt = now + this.randomEventDelay();
    const candidates = this.devices.filter((d) => d.injection.type === 'none');
    if (candidates.length === 0) return;

    const bedroom = candidates.find((d) => d.device.id === 'rm-bedroom');
    const basement = candidates.find((d) => d.device.id === 'rm-basement');
    const pool: Array<{ profile: DeviceProfile; type: 'humidity_high' | 'gas_danger' }> = [];
    if (bedroom) pool.push({ profile: bedroom, type: 'humidity_high' });
    if (basement) pool.push({ profile: basement, type: 'gas_danger' });
    if (pool.length === 0) return;

    const pick = pool[Math.floor(Math.random() * pool.length)];
    pick.profile.injection = {
      type: pick.type,
      until: now + 16_000 + Math.floor(Math.random() * 14_000),
    };
  }

  private targetForProfile(d: DeviceProfile, now: number): { humidity: number; temperature: number; gas: number } {
    const t = { ...d.baseline };
    if (d.injection.type !== 'none' && now < d.injection.until) {
      if (d.injection.type === 'humidity_high') {
        t.humidity = 70;
      } else if (d.injection.type === 'gas_danger') {
        t.gas = 460;
      }
    } else if (d.injection.until !== 0 && now >= d.injection.until) {
      d.injection = { type: 'none', until: 0 };
    }
    return t;
  }

  private deriveStatus(d: DeviceProfile): DeviceStatus {
    if (d.actuators.alarmOn) return 'danger';
    if (d.actuators.fanOn || d.actuators.humidifierOn) return 'warning';
    return 'online';
  }

  private maybeRaiseAlert(d: DeviceProfile, prev: DeviceProfile['actuators'], reading: Telemetry): void {
    const transitions: Array<{ flag: boolean; was: boolean; type: AlertType; message?: string }> = [
      { flag: reading.fanOn, was: prev.fanOn, type: 'humidity_high' },
      { flag: reading.humidifierOn, was: prev.humidifierOn, type: 'humidity_low' },
      { flag: reading.alarmOn, was: prev.alarmOn, type: 'gas_danger' },
    ];
    transitions.forEach((t) => {
      if (t.flag && !t.was) {
        const id = `evt-${Date.now()}-${this.alertSeq++}`;
        this.alerts.unshift({
          id,
          deviceId: d.device.id,
          timestamp: reading.timestamp,
          type: t.type,
          severity: ALERT_SEVERITY[t.type],
          message: ALERT_MESSAGES[t.type],
          resolved: false,
        });
      }
      if (!t.flag && t.was) {
        const matching = this.alerts.find(
          (a) => a.deviceId === d.device.id && a.type === t.type && !a.resolved,
        );
        if (matching) matching.resolved = true;
      }
    });

    if (reading.temperature > this.thresholds.tempHigh) {
      const open = this.alerts.find(
        (a) => a.deviceId === d.device.id && a.type === 'temp_high' && !a.resolved,
      );
      if (!open) {
        const id = `evt-${Date.now()}-${this.alertSeq++}`;
        this.alerts.unshift({
          id,
          deviceId: d.device.id,
          timestamp: reading.timestamp,
          type: 'temp_high',
          severity: ALERT_SEVERITY.temp_high,
          message: ALERT_MESSAGES.temp_high,
          resolved: false,
        });
      }
    }

    if (this.alerts.length > 80) {
      this.alerts = this.alerts.slice(0, 80);
    }
  }

  private tick(): void {
    const now = Date.now();
    this.maybeInjectEvent(now);
    let liveExpired = false;

    this.devices.forEach((d) => {
      // Skip simulator updates for any device currently fed by the live
      // bridge. Once the TTL expires the simulator picks back up.
      const liveUntil = this.liveUntil.get(d.device.id) ?? 0;
      if (liveUntil > now) return;
      if (liveUntil !== 0) {
        this.liveUntil.delete(d.device.id);
        liveExpired = true;
      }

      const target = this.targetForProfile(d, now);
      const last = d.history[d.history.length - 1];
      const prevActuators = { ...d.actuators };
      const humidity = clamp(randomWalk(last.humidity, target.humidity, d.noise.humidity), 10, 95);
      const temperature = clamp(randomWalk(last.temperature, target.temperature, d.noise.temperature), 14, 34);
      const gas = clamp(randomWalk(last.gas, target.gas, d.noise.gas), 40, 900);

      d.actuators = applyHysteresis(d.actuators, { humidity, gas }, this.thresholds);
      const reading = this.makeReading(d, humidity, temperature, gas);
      d.history.push(reading);
      if (d.history.length > HISTORY_LIMIT) {
        d.history = d.history.slice(-HISTORY_LIMIT);
      }
      d.device = {
        ...d.device,
        status: this.deriveStatus(d),
        lastSeen: reading.timestamp,
      };
      this.maybeRaiseAlert(d, prevActuators, reading);
    });

    this.notify();
    if (liveExpired) this.notifyLive();
  }

  getDevices(): Device[] {
    return this.devices.map((d) => d.device);
  }

  getDevice(id: string): Device | undefined {
    return this.devices.find((d) => d.device.id === id)?.device;
  }

  getHistory(deviceId?: string): Telemetry[] {
    if (deviceId) {
      const found = this.devices.find((d) => d.device.id === deviceId);
      return found ? [...found.history] : [];
    }
    // Combined: latest reading from each device, newest first
    return this.devices
      .map((d) => d.history[d.history.length - 1])
      .filter(Boolean)
      .slice()
      .reverse();
  }

  getLatest(deviceId: string): Telemetry | undefined {
    const profile = this.devices.find((d) => d.device.id === deviceId);
    if (!profile || profile.history.length === 0) return undefined;
    return profile.history[profile.history.length - 1];
  }

  getAlerts(): AlertEvent[] {
    return [...this.alerts];
  }

  getThresholds(): Thresholds {
    // Stable reference. setThresholds replaces the object atomically, so
    // returning the field directly is safe and prevents downstream
    // useEffect deps from firing on every store tick.
    return this.thresholds;
  }

  setThresholds(next: Thresholds): void {
    this.thresholds = clampThresholds(next);
    this.notify();
  }

  /**
   * Push a reading produced by the backend WS bridge into the store. The
   * device is marked live for `LIVE_TTL_MS` so the simulator pauses for it.
   */
  applyLiveTelemetry(reading: Telemetry): void {
    const profile = this.devices.find((d) => d.device.id === reading.deviceId);
    if (!profile) return;

    profile.actuators = {
      fanOn: reading.fanOn,
      humidifierOn: reading.humidifierOn,
      alarmOn: reading.alarmOn,
    };
    profile.history.push(reading);
    if (profile.history.length > HISTORY_LIMIT) {
      profile.history = profile.history.slice(-HISTORY_LIMIT);
    }
    profile.device = {
      ...profile.device,
      status: this.deriveStatus(profile),
      lastSeen: reading.timestamp,
    };

    const wasLive = (this.liveUntil.get(reading.deviceId) ?? 0) > Date.now();
    this.liveUntil.set(reading.deviceId, Date.now() + LIVE_TTL_MS);

    this.notify();
    if (!wasLive) this.notifyLive();
  }

  isLive(deviceId: string): boolean {
    const until = this.liveUntil.get(deviceId) ?? 0;
    return until > Date.now();
  }

  setLive(deviceId: string, live: boolean): void {
    const wasLive = this.isLive(deviceId);
    if (live) {
      this.liveUntil.set(deviceId, Date.now() + LIVE_TTL_MS);
    } else {
      this.liveUntil.delete(deviceId);
    }
    if (wasLive !== live) this.notifyLive();
  }
}

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

// Singleton — survives Hot Reload by attaching to globalThis. Bump the
// suffix whenever the store's public API changes so stale HMR instances
// from earlier reloads are evicted instead of crashing on missing methods.
const STORE_KEY = '__ROOM_MANAGER_STORE_v2__';
type GlobalWithStore = typeof globalThis & { [STORE_KEY]?: TelemetryStore };
const globalRef = globalThis as GlobalWithStore;
const store: TelemetryStore = globalRef[STORE_KEY] ?? new TelemetryStore(initialDevices);
globalRef[STORE_KEY] = store;

export const telemetryStore = store;

const useStoreVersion = (): number => {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const unsub = store.subscribe(() => setVersion((v) => v + 1));
    return unsub;
  }, []);
  return version;
};

export const useDevices = (): Device[] => {
  useStoreVersion();
  return store.getDevices();
};

export const useTelemetry = (deviceId?: string): Telemetry[] => {
  useStoreVersion();
  return store.getHistory(deviceId);
};

export const useLatestTelemetry = (deviceId: string): Telemetry | undefined => {
  useStoreVersion();
  return store.getLatest(deviceId);
};

export const useAlerts = (): AlertEvent[] => {
  useStoreVersion();
  return store.getAlerts();
};

export interface ThresholdsHook {
  thresholds: Thresholds;
  setThresholds: (t: Thresholds) => void;
}

export const useThresholds = (): ThresholdsHook => {
  useStoreVersion();
  return {
    thresholds: store.getThresholds(),
    setThresholds: (t: Thresholds) => store.setThresholds(t),
  };
};

export const useIsLive = (deviceId: string | undefined): boolean => {
  const [, setVersion] = useState(0);
  useEffect(() => {
    const unsub = store.subscribeLive(() => setVersion((v) => v + 1));
    return unsub;
  }, []);
  if (!deviceId) return false;
  return store.isLive(deviceId);
};
