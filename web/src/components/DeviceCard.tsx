import { Link } from 'react-router-dom';
import type { Device, Telemetry, Thresholds } from '../types';
import StatusPill from './StatusPill';
import ActuatorBadge from './ActuatorBadge';
import Sparkline from './Sparkline';
import TechLabel from './TechLabel';
import { formatNumber, formatInt, relativeTime } from '../lib/format';
import { useIsLive } from '../lib/mockTelemetry';
import styles from './DeviceCard.module.css';

interface DeviceCardProps {
  device: Device;
  latest: Telemetry | undefined;
  history: Telemetry[];
  thresholds: Thresholds;
}

export default function DeviceCard({
  device,
  latest,
  history,
  thresholds,
}: DeviceCardProps): JSX.Element {
  const sparkData = history.slice(-60).map((t) => t.humidity);
  const live = useIsLive(device.id);

  const humidityClass = latest
    ? latest.humidity > thresholds.humidityHigh
      ? styles.warnNumber
      : latest.humidity < thresholds.humidityLow
        ? styles.warnNumber
        : ''
    : '';
  const gasClass = latest && latest.gas > thresholds.gasDanger ? styles.dangerNumber : '';
  const tempClass = latest && latest.temperature > thresholds.tempHigh ? styles.warnNumber : '';

  return (
    <Link
      to={`/devices/${device.id}`}
      className={`${styles.card} ${device.status === 'danger' ? styles.cardAlarm : ''}`}
    >
      <div className={styles.head}>
        <div className={styles.title}>
          <div className={styles.titleRow}>
            <h3 className={styles.name}>{device.name}</h3>
            {live && (
              <span className={styles.livePill} aria-label="Live data from device">
                <span className={styles.livePillDot} />
                Live
              </span>
            )}
          </div>
          <span className={styles.location}>{device.location}</span>
        </div>
        <StatusPill status={device.status} />
      </div>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <TechLabel>Humidity</TechLabel>
          <div className={`${styles.metricValue} ${humidityClass}`}>
            {latest ? formatNumber(latest.humidity, 1) : '—'}
            <span className={styles.metricUnit}>%RH</span>
          </div>
        </div>
        <div className={styles.metric}>
          <TechLabel>Temp</TechLabel>
          <div className={`${styles.metricValue} ${tempClass}`}>
            {latest ? formatNumber(latest.temperature, 1) : '—'}
            <span className={styles.metricUnit}>°C</span>
          </div>
        </div>
        <div className={styles.metric}>
          <TechLabel>Gas</TechLabel>
          <div className={`${styles.metricValue} ${gasClass}`}>
            {latest ? formatInt(latest.gas) : '—'}
            <span className={styles.metricUnit}>ppm</span>
          </div>
        </div>
      </div>

      <div className={styles.spark}>
        <Sparkline data={sparkData} color="var(--brand-green)" height={48} />
      </div>

      <div className={styles.actuators}>
        <ActuatorBadge kind="fan" on={!!latest?.fanOn} />
        <ActuatorBadge kind="humidifier" on={!!latest?.humidifierOn} />
        <ActuatorBadge kind="alarm" on={!!latest?.alarmOn} />
      </div>

      <div className={styles.foot}>
        <span>fw {device.firmware}</span>
        <span>{latest ? `RSSI ${latest.wifiRssi} dBm` : '—'}</span>
        <span>{relativeTime(device.lastSeen)}</span>
        <span className={styles.viewLink}>View →</span>
      </div>
    </Link>
  );
}
