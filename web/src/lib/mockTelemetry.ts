import { useEffect, useState, useSyncExternalStore } from 'react';
import type { AlertEvent, AlertType, Device, Severity, Telemetry, Thresholds } from '../types';
import { applyHysteresis, DEFAULT_THRESHOLDS, type ActuatorState } from './thresholds';
import { clamp } from './format';

const HISTORY_LIMIT = 120;
const TICK_MS = 2000;
const LIVE_TTL_MS = 10_000;

type Listener = () => void;

class MiniEmitter {
  private listeners = new Set<Listener>();
  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };
  emit = (): void => {
    this.listeners.forEach((l) => l());
  };
}

interface DeviceSeed {
  device: Device;
  baseline: { humidity: number; temperature: number; gas: number };
  state: { humidity: number; temperature: number; gas: number; wifiRssi: number };
  actuators: ActuatorState;
  history: Telemetry[];
  // Time of next stress event in ms epoch
  nextEventAt: number;
  // What kind of perturbation is currently active
  activeEvent: 'humidity' | 'gas' | null;
  eventEndsAt: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomWalk(curr: number, target: number, drift: number, jitter: number): number {
  // Pull toward target slowly + add jitter
  const pull = (target - curr) * drift;
  return curr + pull + (Math.random() - 0.5) * jitter * 2;
}

function nextEventDelay(): number {
  // 30–60s between events
  return rand(30_000, 60_000);
}

function makeDevice(id: string, name: string, location: string, firmware: string): Device {
  return {
    id,
    name,
    location,
    status: 'online',
    firmware,
    lastSeen: nowIso(),
  };
}

class TelemetryStore {
  private emitter = new MiniEmitter();
  private alertsEmitter = new MiniEmitter();
  private thresholdsEmitter = new MiniEmitter();
  private liveEmitter = new MiniEmitter();

  private seeds: Map<string, DeviceSeed> = new Map();
  private devicesArr: Device[] = [];
  private alerts: AlertEvent[] = [];
  private thresholds: Thresholds = { ...DEFAULT_THRESHOLDS };

  // Devices currently fed by the backend WS bridge. Value is the epoch ms
  // up to which this device is considered "live" — readings within the TTL
  // suppress simulator output for that device.
  private liveUntil: Map<string, number> = new Map();

  private timer: ReturnType<typeof setInterval> | null = null;
  private alertCounter = 0;

  constructor() {
    this.seedDevices();
    this.start();
  }

  private seedDevices(): void {
    const livingBaseline = { humidity: 48, temperature: 22.5, gas: 110 };

    const now = Date.now();
    const seeds: DeviceSeed[] = [
      {
        device: makeDevice('rm-living', 'Living Room', 'First floor • North', '1.4.2'),
        baseline: livingBaseline,
        state: { ...livingBaseline, wifiRssi: -54 },
        actuators: { fanOn: false, humidifierOn: false, alarmOn: false },
        history: [],
        nextEventAt: now + nextEventDelay(),
        activeEvent: null,
        eventEndsAt: 0,
      },
    ];

    seeds.forEach((s) => this.seeds.set(s.device.id, s));
    this.devicesArr = seeds.map((s) => s.device);

    // Pre-populate history so charts render immediately
    const back = HISTORY_LIMIT;
    for (let i = back; i > 0; i--) {
      const ts = new Date(now - i * TICK_MS).toISOString();
      seeds.forEach((s) => {
        const reading: Telemetry = {
          deviceId: s.device.id,
          timestamp: ts,
          humidity: s.baseline.humidity + (Math.random() - 0.5) * 4,
          temperature: s.baseline.temperature + (Math.random() - 0.5) * 1.2,
          gas: s.baseline.gas + (Math.random() - 0.5) * 30,
          fanOn: false,
          humidifierOn: false,
          alarmOn: false,
          wifiRssi: s.state.wifiRssi + Math.round((Math.random() - 0.5) * 4),
        };
        s.history.push(reading);
      });
    }
  }

  private start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick(): void {
    const now = Date.now();
    let liveExpired = false;

    this.seeds.forEach((seed) => {
      // Skip simulator updates for any device with a fresh live reading.
      // Once the TTL expires the simulator picks back up automatically.
      const liveUntil = this.liveUntil.get(seed.device.id) ?? 0;
      if (liveUntil > now) return;
      if (liveUntil !== 0) {
        // First simulated tick after live data dropped — forget the marker.
        this.liveUntil.delete(seed.device.id);
        liveExpired = true;
      }
      this.tickDevice(seed, now);
    });

    // Mark device status from latest reading & actuators
    this.devicesArr = this.devicesArr.map((d) => {
      const seed = this.seeds.get(d.id);
      if (!seed) return d;
      const last = seed.history[seed.history.length - 1];
      if (!last) return d;
      let status: Device['status'] = 'online';
      if (last.alarmOn) status = 'danger';
      else if (last.fanOn || last.humidifierOn) status = 'warning';
      return {
        ...d,
        status,
        lastSeen: last.timestamp,
      };
    });

    this.emitter.emit();
    if (liveExpired) this.liveEmitter.emit();
  }

  private tickDevice(seed: DeviceSeed, now: number): void {
    // Maybe start an event
    if (seed.activeEvent === null && now >= seed.nextEventAt) {
      if (seed.device.id === 'rm-bedroom') {
        seed.activeEvent = 'humidity';
        seed.eventEndsAt = now + rand(20_000, 35_000);
      } else if (seed.device.id === 'rm-basement') {
        seed.activeEvent = 'gas';
        seed.eventEndsAt = now + rand(15_000, 25_000);
      } else if (Math.random() < 0.3) {
        // Living room occasionally gets a small humidity wobble
        seed.activeEvent = 'humidity';
        seed.eventEndsAt = now + rand(10_000, 18_000);
      } else {
        seed.nextEventAt = now + nextEventDelay();
      }
    }

    // End event
    if (seed.activeEvent !== null && now >= seed.eventEndsAt) {
      seed.activeEvent = null;
      seed.nextEventAt = now + nextEventDelay();
    }

    // Compute drift targets
    let humidityTarget = seed.baseline.humidity;
    let gasTarget = seed.baseline.gas;
    const tempTarget = seed.baseline.temperature;

    if (seed.activeEvent === 'humidity') {
      humidityTarget =
        seed.device.id === 'rm-bedroom' ? 68 : seed.baseline.humidity + rand(-12, 12);
    } else if (seed.activeEvent === 'gas') {
      gasTarget = 460;
    }

    // Actuator influence — fan reduces humidity & gas, humidifier raises humidity
    if (seed.actuators.fanOn) {
      humidityTarget -= 8;
      gasTarget -= 80;
    }
    if (seed.actuators.humidifierOn) {
      humidityTarget += 6;
    }

    // Random walk
    seed.state.humidity = clamp(
      randomWalk(seed.state.humidity, humidityTarget, 0.08, 0.6),
      10,
      95,
    );
    seed.state.temperature = clamp(
      randomWalk(seed.state.temperature, tempTarget, 0.05, 0.18),
      10,
      35,
    );
    seed.state.gas = clamp(randomWalk(seed.state.gas, gasTarget, 0.12, 12), 30, 9999);
    seed.state.wifiRssi = clamp(seed.state.wifiRssi + Math.round((Math.random() - 0.5) * 2), -90, -40);

    // Apply hysteresis
    const newActuators = applyHysteresis(seed.state, seed.actuators, this.thresholds);

    // Detect transitions for alerts
    this.detectAlerts(seed, newActuators);

    seed.actuators = newActuators;

    const reading: Telemetry = {
      deviceId: seed.device.id,
      timestamp: new Date(now).toISOString(),
      humidity: seed.state.humidity,
      temperature: seed.state.temperature,
      gas: seed.state.gas,
      fanOn: seed.actuators.fanOn,
      humidifierOn: seed.actuators.humidifierOn,
      alarmOn: seed.actuators.alarmOn,
      wifiRssi: seed.state.wifiRssi,
    };

    seed.history.push(reading);
    if (seed.history.length > HISTORY_LIMIT) {
      seed.history.shift();
    }
  }

  private detectAlerts(seed: DeviceSeed, next: ActuatorState): void {
    const prev = seed.actuators;
    const t = this.thresholds;
    const s = seed.state;

    if (!prev.alarmOn && next.alarmOn) {
      const isGas = s.gas > t.gasDanger;
      const type: AlertType = isGas ? 'gas_danger' : 'temp_high';
      const severity: Severity = 'danger';
      const msg = isGas
        ? `Gas reading exceeded ${t.gasDanger} ppm (${Math.round(s.gas)} ppm)`
        : `Temperature exceeded ${t.tempHigh}°C (${s.temperature.toFixed(1)}°C)`;
      this.pushAlert(seed.device.id, type, severity, msg);
    }

    if (!prev.fanOn && next.fanOn && s.humidity > t.humidityHigh) {
      this.pushAlert(
        seed.device.id,
        'humidity_high',
        'warning',
        `Humidity above ${t.humidityHigh}% (${s.humidity.toFixed(1)}%RH) — fan engaged`,
      );
    }

    if (!prev.humidifierOn && next.humidifierOn) {
      this.pushAlert(
        seed.device.id,
        'humidity_low',
        'info',
        `Humidity below ${t.humidityLow}% (${s.humidity.toFixed(1)}%RH) — humidifier engaged`,
      );
    }

    // Auto-resolve previous alerts of same type when condition clears
    if (prev.alarmOn && !next.alarmOn) {
      this.resolveAlertsFor(seed.device.id, ['gas_danger', 'temp_high']);
    }
    if (prev.fanOn && !next.fanOn) {
      this.resolveAlertsFor(seed.device.id, ['humidity_high']);
    }
    if (prev.humidifierOn && !next.humidifierOn) {
      this.resolveAlertsFor(seed.device.id, ['humidity_low']);
    }
  }

  private pushAlert(deviceId: string, type: AlertType, severity: Severity, message: string): void {
    this.alertCounter += 1;
    const alert: AlertEvent = {
      id: `alert-${Date.now()}-${this.alertCounter}`,
      deviceId,
      timestamp: nowIso(),
      type,
      severity,
      message,
      resolved: false,
    };
    this.alerts = [alert, ...this.alerts].slice(0, 100);
    this.alertsEmitter.emit();
  }

  private resolveAlertsFor(deviceId: string, types: AlertType[]): void {
    let changed = false;
    this.alerts = this.alerts.map((a) => {
      if (a.deviceId === deviceId && types.includes(a.type) && !a.resolved) {
        changed = true;
        return { ...a, resolved: true };
      }
      return a;
    });
    if (changed) this.alertsEmitter.emit();
  }

  // ─────────── Public API ───────────

  getDevices = (): Device[] => this.devicesArr;

  getHistory = (deviceId: string): Telemetry[] => {
    const seed = this.seeds.get(deviceId);
    return seed ? seed.history : [];
  };

  getLatest = (deviceId: string): Telemetry | undefined => {
    const seed = this.seeds.get(deviceId);
    return seed ? seed.history[seed.history.length - 1] : undefined;
  };

  getAlerts = (): AlertEvent[] => this.alerts;

  toggleAlertResolved = (id: string): void => {
    this.alerts = this.alerts.map((a) => (a.id === id ? { ...a, resolved: !a.resolved } : a));
    this.alertsEmitter.emit();
  };

  getThresholds = (): Thresholds => this.thresholds;

  setThresholds = (patch: Partial<Thresholds>): void => {
    this.thresholds = { ...this.thresholds, ...patch };
    this.thresholdsEmitter.emit();
  };

  subscribeTelemetry = (l: Listener): (() => void) => this.emitter.subscribe(l);
  subscribeAlerts = (l: Listener): (() => void) => this.alertsEmitter.subscribe(l);
  subscribeThresholds = (l: Listener): (() => void) => this.thresholdsEmitter.subscribe(l);
  subscribeLive = (l: Listener): (() => void) => this.liveEmitter.subscribe(l);

  // ─────────── Live bridge integration ───────────

  /**
   * Push a reading produced by the backend WS bridge into the store. The
   * device is marked live for `LIVE_TTL_MS` so the simulator pauses for it.
   * Status / lastSeen are updated immediately so the UI reacts on the same
   * tick.
   */
  applyLiveTelemetry = (reading: Telemetry): void => {
    const seed = this.seeds.get(reading.deviceId);
    if (!seed) return;

    seed.state.humidity = reading.humidity;
    seed.state.temperature = reading.temperature;
    seed.state.gas = reading.gas;
    seed.state.wifiRssi = reading.wifiRssi;
    seed.actuators = {
      fanOn: reading.fanOn,
      humidifierOn: reading.humidifierOn,
      alarmOn: reading.alarmOn,
    };

    seed.history.push(reading);
    if (seed.history.length > HISTORY_LIMIT) {
      seed.history.shift();
    }

    const wasLive = (this.liveUntil.get(reading.deviceId) ?? 0) > Date.now();
    this.liveUntil.set(reading.deviceId, Date.now() + LIVE_TTL_MS);

    let status: Device['status'] = 'online';
    if (reading.alarmOn) status = 'danger';
    else if (reading.fanOn || reading.humidifierOn) status = 'warning';
    this.devicesArr = this.devicesArr.map((d) =>
      d.id === reading.deviceId
        ? { ...d, status, lastSeen: reading.timestamp }
        : d,
    );

    this.emitter.emit();
    if (!wasLive) this.liveEmitter.emit();
  };

  isLive = (deviceId: string): boolean => {
    const until = this.liveUntil.get(deviceId) ?? 0;
    return until > Date.now();
  };

  setLive = (deviceId: string, live: boolean): void => {
    const wasLive = this.isLive(deviceId);
    if (live) {
      this.liveUntil.set(deviceId, Date.now() + LIVE_TTL_MS);
    } else {
      this.liveUntil.delete(deviceId);
    }
    if (wasLive !== live) this.liveEmitter.emit();
  };
}

export const telemetryStore = new TelemetryStore();

// ─────────── Hooks ───────────

export function useDevices(): Device[] {
  return useSyncExternalStore(
    telemetryStore.subscribeTelemetry,
    telemetryStore.getDevices,
    telemetryStore.getDevices,
  );
}

export function useTelemetry(deviceId?: string): {
  latest: Telemetry | undefined;
  history: Telemetry[];
} {
  // We re-render on every tick; pull fresh data from the store.
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = telemetryStore.subscribeTelemetry(() => setTick((n) => n + 1));
    return unsub;
  }, []);

  if (!deviceId) {
    return { latest: undefined, history: [] };
  }
  return {
    latest: telemetryStore.getLatest(deviceId),
    history: telemetryStore.getHistory(deviceId),
  };
}

export function useAlerts(): AlertEvent[] {
  return useSyncExternalStore(
    telemetryStore.subscribeAlerts,
    telemetryStore.getAlerts,
    telemetryStore.getAlerts,
  );
}

export function useThresholds(): [Thresholds, (t: Partial<Thresholds>) => void] {
  const t = useSyncExternalStore(
    telemetryStore.subscribeThresholds,
    telemetryStore.getThresholds,
    telemetryStore.getThresholds,
  );
  return [t, telemetryStore.setThresholds];
}

export function useAlertsActions(): { toggleResolved: (id: string) => void } {
  return { toggleResolved: telemetryStore.toggleAlertResolved };
}

export function useIsLive(deviceId: string | undefined): boolean {
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = telemetryStore.subscribeLive(() => setTick((n) => n + 1));
    return unsub;
  }, []);
  if (!deviceId) return false;
  return telemetryStore.isLive(deviceId);
}
