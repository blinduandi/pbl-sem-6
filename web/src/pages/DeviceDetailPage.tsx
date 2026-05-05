import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import ActuatorBadge from '../components/ActuatorBadge';
import ReadingChart from '../components/ReadingChart';
import StatCard from '../components/StatCard';
import StatusPill from '../components/StatusPill';
import TechLabel from '../components/TechLabel';
import { useDevices, useIsLive, useTelemetry, useThresholds } from '../lib/mockTelemetry';
import { formatInt, formatNumber, relativeTime, rssiToBars } from '../lib/format';
import styles from './DeviceDetailPage.module.css';
import type { Telemetry } from '../types';

interface Segment {
  startPct: number;
  widthPct: number;
}

function buildSegments(history: Telemetry[], key: 'fanOn' | 'humidifierOn' | 'alarmOn'): Segment[] {
  if (history.length < 2) return [];
  const total = history.length - 1;
  const segs: Segment[] = [];
  let runStart: number | null = null;
  for (let i = 0; i < history.length; i++) {
    const on = history[i]![key];
    if (on && runStart === null) runStart = i;
    if ((!on || i === history.length - 1) && runStart !== null) {
      const end = on ? i : i - 1;
      const startPct = (runStart / total) * 100;
      const widthPct = Math.max(0.6, ((end - runStart + 1) / (total + 1)) * 100);
      segs.push({ startPct, widthPct });
      runStart = null;
    }
  }
  return segs;
}

export default function DeviceDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const devices = useDevices();
  const { latest, history } = useTelemetry(id);
  const [thresholds] = useThresholds();
  const live = useIsLive(id);

  const device = devices.find((d) => d.id === id);

  const fanSegs = useMemo(() => buildSegments(history, 'fanOn'), [history]);
  const humSegs = useMemo(() => buildSegments(history, 'humidifierOn'), [history]);
  const alarmSegs = useMemo(() => buildSegments(history, 'alarmOn'), [history]);

  const sparkHum = history.slice(-60).map((t) => t.humidity);
  const sparkTemp = history.slice(-60).map((t) => t.temperature);
  const sparkGas = history.slice(-60).map((t) => t.gas);
  const sparkRssi = history.slice(-60).map((t) => t.wifiRssi);

  const prevHum = history.length > 30 ? history[history.length - 30]!.humidity : undefined;
  const prevTemp = history.length > 30 ? history[history.length - 30]!.temperature : undefined;
  const prevGas = history.length > 30 ? history[history.length - 30]!.gas : undefined;

  function deltaText(curr: number | undefined, prev: number | undefined, digits = 1): string {
    if (curr === undefined || prev === undefined) return '';
    const d = curr - prev;
    return `${d > 0 ? '+' : ''}${d.toFixed(digits)}`;
  }

  function deltaDir(curr: number | undefined, prev: number | undefined): 'up' | 'down' | 'flat' {
    if (curr === undefined || prev === undefined) return 'flat';
    if (curr - prev > 0.05) return 'up';
    if (prev - curr > 0.05) return 'down';
    return 'flat';
  }

  if (!device) {
    return (
      <div className={styles.page}>
        <Link to="/devices" className={styles.back}>
          ← Back to devices
        </Link>
        <div className={styles.notFound}>Device not found.</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link to="/devices" className={styles.back}>
        ← Back to devices
      </Link>

      <header className={styles.head}>
        <div>
          <TechLabel>Device · {device.id}</TechLabel>
          <h1 className={styles.title}>{device.name}</h1>
          <p className={styles.subtitle}>
            {device.location} · firmware {device.firmware} · last seen{' '}
            {relativeTime(device.lastSeen)}
          </p>
        </div>
        <div className={styles.actions}>
          {live && (
            <span className={styles.livePill} aria-label="Live data from device">
              <span className={styles.livePillDot} />
              Live
            </span>
          )}
          <StatusPill status={device.status} />
        </div>
      </header>

      <section className={styles.statRow}>
        <StatCard
          label="Humidity"
          value={latest ? formatNumber(latest.humidity, 1) : '—'}
          unit="%RH"
          delta={
            latest && prevHum !== undefined
              ? {
                  value: deltaText(latest.humidity, prevHum),
                  direction: deltaDir(latest.humidity, prevHum),
                  warn:
                    latest.humidity > thresholds.humidityHigh ||
                    latest.humidity < thresholds.humidityLow,
                }
              : undefined
          }
          spark={{ data: sparkHum, color: 'var(--brand-green)' }}
          meta={
            <>
              <span>
                band {thresholds.humidityLow}–{thresholds.humidityHigh}%
              </span>
              <span>n={history.length}</span>
            </>
          }
        />
        <StatCard
          label="Temperature"
          value={latest ? formatNumber(latest.temperature, 1) : '—'}
          unit="°C"
          delta={
            latest && prevTemp !== undefined
              ? {
                  value: deltaText(latest.temperature, prevTemp),
                  direction: deltaDir(latest.temperature, prevTemp),
                  warn: latest.temperature > thresholds.tempHigh,
                }
              : undefined
          }
          spark={{ data: sparkTemp, color: 'var(--text-primary)' }}
          meta={
            <>
              <span>alarm {`>`}{thresholds.tempHigh}°C</span>
              <span>{latest ? `now ${formatNumber(latest.temperature, 1)}°C` : ''}</span>
            </>
          }
        />
        <StatCard
          label="Gas"
          value={latest ? formatInt(latest.gas) : '—'}
          unit="ppm"
          delta={
            latest && prevGas !== undefined
              ? {
                  value: deltaText(latest.gas, prevGas, 0),
                  direction: deltaDir(latest.gas, prevGas),
                  warn: latest.gas > thresholds.gasDanger,
                }
              : undefined
          }
          spark={{ data: sparkGas, color: 'var(--danger)' }}
          meta={
            <>
              <span>alarm {`>`}{thresholds.gasDanger} ppm</span>
              <span>safe {`<`}{thresholds.gasDangerOff}</span>
            </>
          }
        />
        <StatCard
          label="WiFi"
          value={latest ? `${latest.wifiRssi}` : '—'}
          unit="dBm"
          delta={
            latest
              ? {
                  value: `${rssiToBars(latest.wifiRssi)}/4 bars`,
                  direction: 'flat',
                }
              : undefined
          }
          spark={{ data: sparkRssi, color: 'var(--info)' }}
          meta={
            <>
              <span>broker tcp/1883</span>
              <span>QoS 1</span>
            </>
          }
        />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Humidity</h2>
          <span className="tech-label">last 4 minutes · target band 40–60% RH</span>
        </div>
        <div className={styles.chartCard}>
          <ReadingChart
            data={history}
            metric="humidity"
            unit="%RH"
            height={260}
            band={{
              from: thresholds.humidityLow,
              to: thresholds.humidityHigh,
              label: 'TARGET BAND',
            }}
            domain={[20, 80]}
          />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Temperature</h2>
          <span className="tech-label">DS18B20 onboard probe</span>
        </div>
        <div className={styles.chartCard}>
          <ReadingChart
            data={history}
            metric="temperature"
            unit="°C"
            height={220}
            thresholdLine={{ value: thresholds.tempHigh, label: `${thresholds.tempHigh}°C` }}
            domain={[15, 30]}
          />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Gas (MQ-135 equivalent)</h2>
          <span className="tech-label">log scale not applied · raw ppm</span>
        </div>
        <div className={styles.chartCard}>
          <ReadingChart
            data={history}
            metric="gas"
            unit="ppm"
            height={220}
            thresholdLine={{ value: thresholds.gasDanger, label: `${thresholds.gasDanger}` }}
            domain={[0, 600]}
          />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Actuator timeline</h2>
          <span className="tech-label">rolling {history.length}-sample window</span>
        </div>
        <div className={styles.timelineCard}>
          <div className={styles.actuators}>
            <ActuatorBadge kind="fan" on={!!latest?.fanOn} />
            <ActuatorBadge kind="humidifier" on={!!latest?.humidifierOn} />
            <ActuatorBadge kind="alarm" on={!!latest?.alarmOn} />
          </div>
          <div className={styles.timeline}>
            <div className={styles.timelineRow}>
              <div className={styles.timelineLabel}>
                <span className={styles.timelineLabelMain}>Fan</span>
                <span className={styles.timelineLabelSub}>GPIO 14 · relay K1</span>
              </div>
              <div className={styles.timelineTrack}>
                {fanSegs.map((s, i) => (
                  <span
                    key={i}
                    className={`${styles.timelineSegment} ${styles.segFan}`}
                    style={{ left: `${s.startPct}%`, width: `${s.widthPct}%` }}
                  />
                ))}
              </div>
            </div>
            <div className={styles.timelineRow}>
              <div className={styles.timelineLabel}>
                <span className={styles.timelineLabelMain}>Humidifier</span>
                <span className={styles.timelineLabelSub}>GPIO 27 · relay K2</span>
              </div>
              <div className={styles.timelineTrack}>
                {humSegs.map((s, i) => (
                  <span
                    key={i}
                    className={`${styles.timelineSegment} ${styles.segHumidifier}`}
                    style={{ left: `${s.startPct}%`, width: `${s.widthPct}%` }}
                  />
                ))}
              </div>
            </div>
            <div className={styles.timelineRow}>
              <div className={styles.timelineLabel}>
                <span className={styles.timelineLabelMain}>Alarm</span>
                <span className={styles.timelineLabelSub}>GPIO 26 · buzzer</span>
              </div>
              <div className={styles.timelineTrack}>
                {alarmSegs.map((s, i) => (
                  <span
                    key={i}
                    className={`${styles.timelineSegment} ${styles.segAlarm}`}
                    style={{ left: `${s.startPct}%`, width: `${s.widthPct}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className={styles.timelineLegend}>
            <span>
              <span
                className={styles.legendDot}
                style={{ background: 'var(--info)' }}
              />
              fan
            </span>
            <span>
              <span
                className={styles.legendDot}
                style={{ background: 'var(--brand-green)' }}
              />
              humidifier
            </span>
            <span>
              <span
                className={styles.legendDot}
                style={{ background: 'var(--danger)' }}
              />
              alarm
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
