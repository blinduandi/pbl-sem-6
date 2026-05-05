/**
 * Synthesizes the same JSON-line format the Mega firmware emits, for
 * developing without hardware. Mimics:
 *   - 2 s tick cadence
 *   - bounded random walk around (RH=50, T=22, GAS=120)
 *   - a 15-second gas spike up to ~450 ppm roughly every 30 s
 *
 * The shape matches the Mega's `Serial.println(json)` exactly so the
 * parsing path through `JSON.parse(line)` is identical.
 */
export interface DemoSourceOptions {
  deviceId: string;
  onLine: (line: string) => void;
}

const TICK_MS = 2_000;
const SPIKE_DURATION_MS = 15_000;
const SPIKE_INTERVAL_MS = 30_000;

const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

const round1 = (v: number): number => Math.round(v * 10) / 10;

export class DemoSource {
  private timer: NodeJS.Timeout | null = null;
  private humidity = 50;
  private temperature = 22;
  private gas = 120;
  private uptime = 0;
  private fanOn = false;
  private humidifierOn = false;
  private alarmOn = false;
  private spikeStartedAt: number | null = null;
  private nextSpikeAt: number = Date.now() + SPIKE_INTERVAL_MS;

  constructor(private readonly opts: DemoSourceOptions) {}

  start(): void {
    if (this.timer) return;
    // Fire one immediately so a watching dev sees output without waiting.
    this.tick();
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
    this.uptime += TICK_MS / 1000;

    // Centred jitter in [-1, 1]
    const jitter = (): number => Math.random() * 2 - 1;

    this.humidity = clamp(this.humidity + jitter() * 0.5, 10, 95);
    this.temperature = clamp(this.temperature + jitter() * 0.2, 5, 40);

    // Spike scheduler: fire a 15-second gas excursion ~every 30 s.
    if (this.spikeStartedAt === null && now >= this.nextSpikeAt) {
      this.spikeStartedAt = now;
    }
    if (this.spikeStartedAt !== null) {
      const elapsed = now - this.spikeStartedAt;
      if (elapsed >= SPIKE_DURATION_MS) {
        this.spikeStartedAt = null;
        this.nextSpikeAt = now + SPIKE_INTERVAL_MS;
      }
    }

    if (this.spikeStartedAt !== null) {
      // Ramp toward ~450 ppm, then drift back. Adds dramatic but bounded
      // motion so the alarm threshold (300 ppm) trips during the demo.
      const target = 450;
      this.gas = clamp(this.gas + (target - this.gas) * 0.25 + jitter() * 10, 0, 1500);
    } else {
      this.gas = clamp(this.gas + jitter() * 10, 0, 1500);
      // Lazy drift back toward baseline so post-spike values don't pin high.
      this.gas += (120 - this.gas) * 0.05;
    }

    // Cheap derived booleans so the demo line looks just like the Mega's.
    this.fanOn = this.humidity > 60;
    this.humidifierOn = this.humidity < 40;
    this.alarmOn = this.gas > 300;

    const line = JSON.stringify({
      deviceId: this.opts.deviceId,
      humidity: round1(this.humidity),
      temperature: round1(this.temperature),
      gas: Math.round(this.gas),
      fanOn: this.fanOn,
      humidifierOn: this.humidifierOn,
      alarmOn: this.alarmOn,
      uptime: Math.round(this.uptime),
    });
    this.opts.onLine(line);
  }
}
