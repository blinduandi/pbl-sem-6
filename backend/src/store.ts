import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import type {
  AlertEvent,
  AlertType,
  Device,
  LiveStatus,
  Severity,
  Telemetry,
  Thresholds,
} from './types.js';
import { DEFAULT_THRESHOLDS, sanitiseThresholdPatch } from './thresholds.js';

const HISTORY_LIMIT = 60;
const ALERT_LIMIT = 100;

/**
 * Strongly-typed EventEmitter so subscribers know exactly what they get.
 */
export interface StoreEvents {
  telemetry: (t: Telemetry) => void;
  state: (d: Device) => void;
  alert: (a: AlertEvent) => void;
  thresholds: (t: Thresholds) => void;
  'live-status': (s: LiveStatus) => void;
}

export declare interface Store {
  on<K extends keyof StoreEvents>(event: K, listener: StoreEvents[K]): this;
  off<K extends keyof StoreEvents>(event: K, listener: StoreEvents[K]): this;
  emit<K extends keyof StoreEvents>(
    event: K,
    ...args: Parameters<StoreEvents[K]>
  ): boolean;
}

/**
 * In-memory store for devices, telemetry history, alerts, and thresholds.
 * Emits typed events whenever any of these change so transports (REST cache,
 * WebSocket fan-out, ...) can react.
 */
export class Store extends EventEmitter {
  private readonly devices = new Map<string, Device>();
  private readonly histories = new Map<string, Telemetry[]>();
  private readonly latest = new Map<string, Telemetry>();
  private readonly alerts: AlertEvent[] = [];
  private thresholds: Thresholds = { ...DEFAULT_THRESHOLDS };
  /**
   * Per-device "this device is reporting live data" deadline (epoch ms).
   * If `Date.now() < liveUntil[deviceId]`, the simulator should skip
   * synthetic ticks for that device.
   */
  private readonly liveUntil = new Map<string, number>();

  constructor(initialDevices: Device[]) {
    super();
    for (const device of initialDevices) {
      this.devices.set(device.id, { ...device });
      this.histories.set(device.id, []);
    }
  }

  // ---------- devices ----------

  listDevices(): Device[] {
    return Array.from(this.devices.values()).map((d) => ({ ...d }));
  }

  getDevice(id: string): Device | undefined {
    const d = this.devices.get(id);
    return d ? { ...d } : undefined;
  }

  upsertDevice(device: Device): void {
    this.devices.set(device.id, { ...device });
    if (!this.histories.has(device.id)) {
      this.histories.set(device.id, []);
    }
    this.emit('state', { ...device });
  }

  // ---------- telemetry ----------

  recordTelemetry(t: Telemetry): void {
    this.latest.set(t.deviceId, t);
    const history = this.histories.get(t.deviceId);
    if (history) {
      history.push(t);
      if (history.length > HISTORY_LIMIT) {
        history.splice(0, history.length - HISTORY_LIMIT);
      }
    }
    this.emit('telemetry', t);
  }

  getLatest(deviceId: string): Telemetry | undefined {
    return this.latest.get(deviceId);
  }

  getLatestAll(): Record<string, Telemetry | null> {
    const out: Record<string, Telemetry | null> = {};
    for (const id of this.devices.keys()) {
      out[id] = this.latest.get(id) ?? null;
    }
    return out;
  }

  getHistory(deviceId: string): Telemetry[] {
    return [...(this.histories.get(deviceId) ?? [])];
  }

  // ---------- live override ----------

  /**
   * Record a telemetry reading sourced from a real device (via the serial
   * bridge) and mark that device as "live" for the next `ttlMs` ms. While
   * a device is live, the simulator must skip its synthetic tick — see
   * `isLive`.
   *
   * Emits a `live-status` event when the live flag transitions from
   * false→true. `recordTelemetry` is delegated to so the existing fan-out
   * (history, latest, telemetry event → WebSocket) is unchanged.
   */
  applyLiveTelemetry(reading: Telemetry, ttlMs: number = 10_000): void {
    const wasLive = this.isLive(reading.deviceId);
    this.recordTelemetry(reading);
    this.liveUntil.set(reading.deviceId, Date.now() + ttlMs);
    if (!wasLive) {
      this.emit('live-status', { deviceId: reading.deviceId, live: true });
    }
  }

  /**
   * True iff this device has reported live data within its TTL.
   * Side effect: when the TTL expires, emits a one-shot `live-status`
   * `{live: false}` event so callers can broadcast the transition.
   */
  isLive(deviceId: string): boolean {
    const deadline = this.liveUntil.get(deviceId);
    if (deadline === undefined) return false;
    if (Date.now() < deadline) return true;
    // TTL just expired — clean up and notify exactly once.
    this.liveUntil.delete(deviceId);
    this.emit('live-status', { deviceId, live: false });
    return false;
  }

  // ---------- alerts ----------

  pushAlert(args: {
    deviceId: string;
    type: AlertType;
    severity: Severity;
    message: string;
  }): AlertEvent {
    const event: AlertEvent = {
      id: randomUUID(),
      deviceId: args.deviceId,
      timestamp: new Date().toISOString(),
      type: args.type,
      severity: args.severity,
      message: args.message,
      resolved: false,
    };
    this.alerts.unshift(event);
    if (this.alerts.length > ALERT_LIMIT) {
      this.alerts.length = ALERT_LIMIT;
    }
    this.emit('alert', event);
    return event;
  }

  resolveAlerts(deviceId: string, type: AlertType): void {
    for (const alert of this.alerts) {
      if (
        !alert.resolved &&
        alert.deviceId === deviceId &&
        alert.type === type
      ) {
        alert.resolved = true;
      }
    }
  }

  listAlerts(): AlertEvent[] {
    return this.alerts.map((a) => ({ ...a }));
  }

  // ---------- thresholds ----------

  getThresholds(): Thresholds {
    return { ...this.thresholds };
  }

  updateThresholds(patch: unknown): Thresholds {
    const safe = sanitiseThresholdPatch(patch);
    this.thresholds = { ...this.thresholds, ...safe };
    this.emit('thresholds', { ...this.thresholds });
    return this.getThresholds();
  }
}
