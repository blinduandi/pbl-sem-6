import { useMemo, useState } from 'react';
import ThresholdSlider from '../components/ThresholdSlider';
import TechLabel from '../components/TechLabel';
import { telemetryStore, useDevices, useThresholds } from '../lib/mockTelemetry';
import { DEFAULT_THRESHOLDS } from '../lib/thresholds';
import { formatNumber } from '../lib/format';
import type { Thresholds } from '../types';
import styles from './ThresholdsPage.module.css';

export default function ThresholdsPage(): JSX.Element {
  const [stored, setStored] = useThresholds();
  const [draft, setDraft] = useState<Thresholds>(stored);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const devices = useDevices();

  const dirty = useMemo(
    () => (Object.keys(draft) as (keyof Thresholds)[]).some((k) => draft[k] !== stored[k]),
    [draft, stored],
  );

  function update<K extends keyof Thresholds>(key: K, value: number): void {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function save(): void {
    // Enforce off-thresholds sit between bands
    const safe: Thresholds = {
      ...draft,
      humidityHighOff: Math.min(draft.humidityHighOff, draft.humidityHigh - 1),
      humidityLowOff: Math.max(draft.humidityLowOff, draft.humidityLow + 1),
      gasDangerOff: Math.min(draft.gasDangerOff, draft.gasDanger - 1),
    };
    setStored(safe);
    setDraft(safe);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2400);
  }

  function reset(): void {
    setDraft({ ...DEFAULT_THRESHOLDS });
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <TechLabel>Configuration</TechLabel>
          <h1 className={styles.title}>Thresholds</h1>
          <p className={styles.lead}>
            Hysteresis bands keep actuators from chattering. Each metric has an ON point and an
            OFF point — the actuator engages when the value crosses ON and only releases once the
            value moves past OFF.
          </p>
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.formCard}>
          <div className={styles.group}>
            <div className={styles.groupHeader}>
              <span className={styles.groupTitle}>Humidity — high (fan)</span>
              <span className={styles.groupHint}>
                Engages the fan when humidity climbs above ON. Releases once the air dries below
                OFF.
              </span>
            </div>
            <ThresholdSlider
              label="Fan ON above"
              hint="default 60%"
              value={draft.humidityHigh}
              min={45}
              max={80}
              unit="%"
              onChange={(v) => update('humidityHigh', v)}
            />
            <ThresholdSlider
              label="Fan OFF below"
              hint="default 55%"
              value={draft.humidityHighOff}
              min={40}
              max={75}
              unit="%"
              onChange={(v) => update('humidityHighOff', v)}
            />
          </div>

          <div className={styles.group}>
            <div className={styles.groupHeader}>
              <span className={styles.groupTitle}>Humidity — low (humidifier)</span>
              <span className={styles.groupHint}>
                Engages the humidifier when air gets too dry; releases once the band is restored.
              </span>
            </div>
            <ThresholdSlider
              label="Humidifier ON below"
              hint="default 40%"
              value={draft.humidityLow}
              min={20}
              max={50}
              unit="%"
              onChange={(v) => update('humidityLow', v)}
            />
            <ThresholdSlider
              label="Humidifier OFF above"
              hint="default 45%"
              value={draft.humidityLowOff}
              min={25}
              max={55}
              unit="%"
              onChange={(v) => update('humidityLowOff', v)}
            />
          </div>

          <div className={styles.group}>
            <div className={styles.groupHeader}>
              <span className={styles.groupTitle}>Gas — danger</span>
              <span className={styles.groupHint}>
                Triggers the alarm and forces the fan ON regardless of humidity.
              </span>
            </div>
            <ThresholdSlider
              label="Alarm ON above"
              hint="default 300 ppm"
              value={draft.gasDanger}
              min={150}
              max={800}
              unit=" ppm"
              onChange={(v) => update('gasDanger', v)}
            />
            <ThresholdSlider
              label="Alarm OFF below"
              hint="default 270 ppm"
              value={draft.gasDangerOff}
              min={120}
              max={780}
              unit=" ppm"
              onChange={(v) => update('gasDangerOff', v)}
            />
          </div>

          <div className={styles.group}>
            <div className={styles.groupHeader}>
              <span className={styles.groupTitle}>Temperature</span>
              <span className={styles.groupHint}>
                A high reading raises a danger alert (no associated cooling actuator).
              </span>
            </div>
            <ThresholdSlider
              label="Alarm above"
              hint="default 26°C"
              value={draft.tempHigh}
              min={18}
              max={35}
              unit="°C"
              onChange={(v) => update('tempHigh', v)}
            />
          </div>

          <div className={styles.actions}>
            <button className="pill" onClick={save} disabled={!dirty}>
              Save thresholds
            </button>
            <button className="pill pill-secondary" onClick={reset}>
              Reset defaults
            </button>
            {savedAt && <span className={styles.savedHint}>● Applied to all devices</span>}
          </div>
        </div>

        <div className={styles.previewCol}>
          <div className={styles.preview}>
            <div className={styles.previewTitle}>Live preview · humidity bands</div>
            {devices.map((d) => {
              const latest = telemetryStore.getLatest(d.id);
              const hum = latest?.humidity ?? 50;
              const min = 20;
              const max = 80;
              const pct = (v: number) =>
                `${Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))}%`;
              const inLow = hum < draft.humidityLow;
              const inHigh = hum > draft.humidityHigh;
              const status = inHigh
                ? styles.statusDanger
                : inLow
                  ? styles.statusWarn
                  : styles.statusOk;
              const statusText = inHigh ? 'TOO HIGH' : inLow ? 'TOO LOW' : 'IN BAND';
              return (
                <div key={d.id} className={styles.previewRow}>
                  <div>
                    <div className={styles.previewDevice}>
                      <span className={styles.previewName}>{d.name}</span>
                      <span className={styles.previewLoc}>{d.location}</span>
                    </div>
                    <div className={styles.bar}>
                      <span
                        className={styles.barBand}
                        style={{
                          left: pct(draft.humidityLow),
                          width: `calc(${pct(draft.humidityHigh)} - ${pct(draft.humidityLow)})`,
                        }}
                      />
                      <span
                        className={styles.barMarker}
                        style={{ left: pct(hum) }}
                        title={`${hum.toFixed(1)}%`}
                      />
                    </div>
                    <div className={styles.barLabels}>
                      <span>{min}%</span>
                      <span>
                        {draft.humidityLow}% – {draft.humidityHigh}%
                      </span>
                      <span>{max}%</span>
                    </div>
                  </div>
                  <div className={styles.previewValue}>
                    <div>{formatNumber(hum, 1)}%</div>
                    <div className={status} style={{ fontSize: 10, marginTop: 4 }}>
                      {statusText}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.preview}>
            <div className={styles.previewTitle}>Gas thresholds</div>
            {devices.map((d) => {
              const latest = telemetryStore.getLatest(d.id);
              const gas = latest?.gas ?? 100;
              const min = 0;
              const max = 700;
              const pct = (v: number) =>
                `${Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))}%`;
              const danger = gas > draft.gasDanger;
              return (
                <div key={d.id} className={styles.previewRow}>
                  <div>
                    <div className={styles.previewDevice}>
                      <span className={styles.previewName}>{d.name}</span>
                      <span className={styles.previewLoc}>{d.location}</span>
                    </div>
                    <div className={styles.bar}>
                      <span
                        className={styles.barBand}
                        style={{
                          left: pct(draft.gasDangerOff),
                          width: `calc(${pct(draft.gasDanger)} - ${pct(draft.gasDangerOff)})`,
                          background: 'rgba(245, 165, 36, 0.18)',
                          borderColor: 'rgba(245, 165, 36, 0.4)',
                        }}
                      />
                      <span className={styles.barMarker} style={{ left: pct(gas) }} />
                    </div>
                    <div className={styles.barLabels}>
                      <span>0</span>
                      <span>
                        OFF {draft.gasDangerOff} · ON {draft.gasDanger}
                      </span>
                      <span>{max}</span>
                    </div>
                  </div>
                  <div className={styles.previewValue}>
                    <div>{Math.round(gas)} ppm</div>
                    <div
                      className={danger ? styles.statusDanger : styles.statusOk}
                      style={{ fontSize: 10, marginTop: 4 }}
                    >
                      {danger ? 'DANGER' : 'SAFE'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
