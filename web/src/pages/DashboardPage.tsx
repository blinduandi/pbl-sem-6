import { Link } from 'react-router-dom';
import DeviceCard from '../components/DeviceCard';
import StatusPill from '../components/StatusPill';
import TechLabel from '../components/TechLabel';
import {
  telemetryStore,
  useAlerts,
  useDevices,
  useTelemetry,
  useThresholds,
} from '../lib/mockTelemetry';
import { formatNumber, relativeTime } from '../lib/format';
import styles from './DashboardPage.module.css';

export default function DashboardPage(): JSX.Element {
  const devices = useDevices();
  const alerts = useAlerts();
  const [thresholds] = useThresholds();
  // Subscribe to ticks so card data refreshes
  useTelemetry();

  const onlineCount = devices.filter((d) => d.status !== 'offline').length;
  const activeAlarms = alerts.filter((a) => !a.resolved && a.severity === 'danger').length;
  const activeWarnings = alerts.filter((a) => !a.resolved && a.severity === 'warning').length;

  const allLatest = devices
    .map((d) => telemetryStore.getLatest(d.id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  const avgRH =
    allLatest.length > 0
      ? allLatest.reduce((sum, t) => sum + t.humidity, 0) / allLatest.length
      : 0;
  const avgTemp =
    allLatest.length > 0
      ? allLatest.reduce((sum, t) => sum + t.temperature, 0) / allLatest.length
      : 0;

  const recentActivity = alerts.slice(0, 5);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <TechLabel>
          <span className={styles.eyebrow}>● Live · MQTT broker connected</span>
        </TechLabel>
        <h1 className={styles.heroTitle}>Indoor air quality, automated.</h1>
        <p className={styles.heroLead}>
          Three ESP32 sensors stream humidity, temperature and gas readings every two seconds.
          Fans, humidifiers and alarms react in real time using configurable hysteresis bands —
          no cloud round-trip required.
        </p>
        <div className={styles.heroActions}>
          <Link to="/devices" className="pill">
            View devices
          </Link>
          <Link to="/thresholds" className="pill pill-secondary">
            Tune thresholds
          </Link>
        </div>
      </header>

      <section className={styles.summary}>
        <div className={styles.summaryCard}>
          <TechLabel>Devices online</TechLabel>
          <div className={styles.summaryValue}>
            {onlineCount}
            <span style={{ color: 'var(--text-muted)', fontSize: 18, marginLeft: 6 }}>
              / {devices.length}
            </span>
          </div>
          <span className={styles.summaryHint}>uplink heartbeat 2s</span>
        </div>
        <div className={styles.summaryCard}>
          <TechLabel>Active alarms</TechLabel>
          <div
            className={`${styles.summaryValue} ${
              activeAlarms > 0 ? styles.dangerNumber : ''
            }`}
          >
            {activeAlarms}
          </div>
          <span className={styles.summaryHint}>
            {activeWarnings} warnings · {alerts.length} total
          </span>
        </div>
        <div className={styles.summaryCard}>
          <TechLabel>Avg humidity</TechLabel>
          <div className={styles.summaryValue}>
            {formatNumber(avgRH, 1)}
            <span style={{ color: 'var(--text-muted)', fontSize: 18, marginLeft: 6 }}>%RH</span>
          </div>
          <span className={styles.summaryHint}>
            band {thresholds.humidityLow}–{thresholds.humidityHigh}% target
          </span>
        </div>
        <div className={styles.summaryCard}>
          <TechLabel>Avg temperature</TechLabel>
          <div className={styles.summaryValue}>
            {formatNumber(avgTemp, 1)}
            <span style={{ color: 'var(--text-muted)', fontSize: 18, marginLeft: 6 }}>°C</span>
          </div>
          <span className={styles.summaryHint}>alarm above {thresholds.tempHigh}°C</span>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Live rooms</h2>
          <span className={styles.sectionAside}>
            updated {recentActivity[0] ? relativeTime(recentActivity[0].timestamp) : 'just now'}
          </span>
        </div>
        <div className={styles.deviceGrid}>
          {devices.map((d) => (
            <DeviceCard
              key={d.id}
              device={d}
              latest={telemetryStore.getLatest(d.id)}
              history={telemetryStore.getHistory(d.id)}
              thresholds={thresholds}
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Recent activity</h2>
          <Link to="/alerts" className="pill pill-ghost">
            All alerts
          </Link>
        </div>
        <div className={styles.activityList}>
          {recentActivity.length === 0 ? (
            <div className={styles.activityEmpty}>No alerts yet — everything looks calm.</div>
          ) : (
            recentActivity.map((a) => {
              const device = devices.find((d) => d.id === a.deviceId);
              const status =
                a.severity === 'danger' ? 'danger' : a.severity === 'warning' ? 'warning' : 'online';
              return (
                <div key={a.id} className={styles.activityItem}>
                  <span className={styles.activityTime}>{relativeTime(a.timestamp)}</span>
                  <span className={styles.activityMsg}>
                    <strong style={{ fontWeight: 500 }}>{device?.name ?? a.deviceId}</strong>
                    {' — '}
                    {a.message}
                  </span>
                  <StatusPill
                    status={status}
                    label={a.resolved ? 'Resolved' : a.severity}
                  />
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
