import type { Device, Telemetry, Thresholds } from './types.js';
import { applyHysteresis } from './thresholds.js';
import type { Store } from './store.js';
import { DEFAULT_PROFILES, type DeviceProfile } from './profiles.js';
import { makeRandom } from './rng.js';
import { evaluateAlerts } from './alerts.js';

export { DEFAULT_PROFILES };
export type { DeviceProfile };

interface RuntimeState {
  humidity: number;
  temperature: number;
  gas: number;
  fanOn: boolean;
  humidifierOn: boolean;
  alarmOn: boolean;
  wifiRssi: number;
  /** Remaining ticks of an active spike, if any. */
  spikeTicks: number;
  spikeKind: 'humidity' | 'gas' | null;
}

const TELEMETRY_INTERVAL_MS = 2000;
const STATE_INTERVAL_MS = 5000;

const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

const round = (value: number, dp: number): number => {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
};

function deriveStatus(st: RuntimeState): Device['status'] {
  if (st.alarmOn) return 'danger';
  if (st.fanOn || st.humidifierOn) return 'warning';
  return 'online';
}

/**
 * The simulator drives the in-memory Store: every TELEMETRY_INTERVAL_MS it
 * emits a new Telemetry sample per device, and every STATE_INTERVAL_MS it
 * re-publishes Device state. Threshold breaches are converted into
 * AlertEvents using hysteresis so a single excursion produces a single alert.
 */
export class TelemetrySimulator {
  private readonly profiles: DeviceProfile[];
  private readonly state = new Map<string, RuntimeState>();
  private readonly rand: () => number;
  private telemetryTimer: NodeJS.Timeout | null = null;
  private stateTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly store: Store,
    profiles: DeviceProfile[] = DEFAULT_PROFILES,
    seed?: number,
  ) {
    this.profiles = profiles;
    this.rand = makeRandom(seed);

    for (const p of profiles) {
      this.state.set(p.device.id, {
        humidity: p.baseHumidity,
        temperature: p.baseTemperature,
        gas: p.baseGas,
        fanOn: false,
        humidifierOn: false,
        alarmOn: false,
        wifiRssi: -55,
        spikeTicks: 0,
        spikeKind: null,
      });
      store.upsertDevice(p.device);
    }
  }

  start(): void {
    if (this.telemetryTimer || this.stateTimer) return;
    this.telemetryTimer = setInterval(() => this.tickTelemetry(), TELEMETRY_INTERVAL_MS);
    this.stateTimer = setInterval(() => this.tickState(), STATE_INTERVAL_MS);
    this.tickTelemetry(); // first sample immediately so dashboards aren't empty
  }

  stop(): void {
    if (this.telemetryTimer) clearInterval(this.telemetryTimer);
    if (this.stateTimer) clearInterval(this.stateTimer);
    this.telemetryTimer = null;
    this.stateTimer = null;
  }

  /** Centred random in [-1, 1]. */
  private noise(): number {
    return this.rand() * 2 - 1;
  }

  private maybeStartSpike(profile: DeviceProfile, st: RuntimeState): void {
    if (st.spikeTicks > 0) return;
    const r = this.rand();
    if (profile.spike.humidity && r < profile.spike.humidity) {
      st.spikeTicks = 6 + Math.floor(this.rand() * 6); // 6–11 ticks (~12–22 s)
      st.spikeKind = 'humidity';
    } else if (profile.spike.gas && r < profile.spike.gas) {
      st.spikeTicks = 6 + Math.floor(this.rand() * 6);
      st.spikeKind = 'gas';
    }
  }

  private buildSample(profile: DeviceProfile, st: RuntimeState): Telemetry {
    // bounded random walk back toward baseline
    const pull = (current: number, base: number, step: number): number =>
      current + this.noise() * step + (base - current) * 0.05;

    st.humidity = clamp(pull(st.humidity, profile.baseHumidity, 0.5), 10, 95);
    st.temperature = clamp(pull(st.temperature, profile.baseTemperature, 0.15), -5, 45);
    st.gas = clamp(pull(st.gas, profile.baseGas, 6), 0, 1500);
    st.wifiRssi = clamp(st.wifiRssi + this.noise() * 2, -90, -30);

    this.maybeStartSpike(profile, st);
    if (st.spikeTicks > 0) {
      if (st.spikeKind === 'humidity') {
        st.humidity = clamp(st.humidity + 4 + this.rand() * 6, 10, 95);
      } else if (st.spikeKind === 'gas') {
        st.gas = clamp(st.gas + 80 + this.rand() * 250, 0, 1500);
      }
      st.spikeTicks -= 1;
      if (st.spikeTicks === 0) st.spikeKind = null;
    }

    const thresholds: Thresholds = this.store.getThresholds();
    const next = applyHysteresis(
      { humidity: st.humidity, gas: st.gas },
      { fanOn: st.fanOn, humidifierOn: st.humidifierOn, alarmOn: st.alarmOn },
      thresholds,
    );

    evaluateAlerts(this.store, {
      deviceId: profile.device.id,
      prev: { fanOn: st.fanOn, humidifierOn: st.humidifierOn, alarmOn: st.alarmOn },
      next,
      temperature: st.temperature,
      thresholds,
    });

    st.fanOn = next.fanOn;
    st.humidifierOn = next.humidifierOn;
    st.alarmOn = next.alarmOn;

    return {
      deviceId: profile.device.id,
      timestamp: new Date().toISOString(),
      humidity: round(st.humidity, 1),
      temperature: round(st.temperature, 1),
      gas: Math.round(st.gas),
      fanOn: st.fanOn,
      humidifierOn: st.humidifierOn,
      alarmOn: st.alarmOn,
      wifiRssi: Math.round(st.wifiRssi),
    };
  }

  private tickTelemetry(): void {
    for (const profile of this.profiles) {
      const st = this.state.get(profile.device.id);
      if (!st) continue;
      // Skip synthetic ticks for any device that is currently reporting
      // live data via the serial bridge — we don't want to overwrite the
      // real reading with a fake one. Other devices keep ticking.
      if (this.store.isLive(profile.device.id)) continue;
      this.store.recordTelemetry(this.buildSample(profile, st));
    }
  }

  private tickState(): void {
    for (const profile of this.profiles) {
      const st = this.state.get(profile.device.id);
      if (!st) continue;
      if (this.store.isLive(profile.device.id)) continue;
      this.store.upsertDevice({
        ...profile.device,
        status: deriveStatus(st),
        lastSeen: new Date().toISOString(),
      });
    }
  }
}
