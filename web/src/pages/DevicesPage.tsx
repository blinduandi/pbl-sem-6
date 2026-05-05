import { Link } from 'react-router-dom';
import StatusPill from '../components/StatusPill';
import TechLabel from '../components/TechLabel';
import { telemetryStore, useDevices, useTelemetry } from '../lib/mockTelemetry';
import { formatInt, formatNumber, relativeTime } from '../lib/format';
import styles from './DevicesPage.module.css';

export default function DevicesPage(): JSX.Element {
  const devices = useDevices();
  // tick subscription for live values
  useTelemetry();

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <TechLabel>Fleet</TechLabel>
          <h1 className={styles.title}>Devices</h1>
          <p className={styles.lead}>
            All ESP32 nodes registered to this broker. Click a row to inspect live telemetry.
          </p>
        </div>
        <Link to="/thresholds" className="pill pill-secondary">
          Tune thresholds
        </Link>
      </header>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th>Device</th>
              <th>Status</th>
              <th>Humidity</th>
              <th className={styles.colHide}>Temp</th>
              <th className={styles.colHide}>Gas</th>
              <th className={styles.colHide}>Firmware</th>
              <th>Last seen</th>
              <th />
            </tr>
          </thead>
          <tbody className={styles.tbody}>
            {devices.map((d) => {
              const latest = telemetryStore.getLatest(d.id);
              return (
                <tr key={d.id}>
                  <td>
                    <div className={styles.deviceName}>
                      <span className={styles.nameMain}>{d.name}</span>
                      <span className={styles.location}>{d.location}</span>
                    </div>
                  </td>
                  <td>
                    <StatusPill status={d.status} />
                  </td>
                  <td>
                    <span className={styles.metric}>
                      {latest ? formatNumber(latest.humidity, 1) : '—'}
                      <span className={styles.unit}>%RH</span>
                    </span>
                  </td>
                  <td className={styles.colHide}>
                    <span className={styles.metric}>
                      {latest ? formatNumber(latest.temperature, 1) : '—'}
                      <span className={styles.unit}>°C</span>
                    </span>
                  </td>
                  <td className={styles.colHide}>
                    <span className={styles.metric}>
                      {latest ? formatInt(latest.gas) : '—'}
                      <span className={styles.unit}>ppm</span>
                    </span>
                  </td>
                  <td className={`${styles.mono} ${styles.colHide}`}>{d.firmware}</td>
                  <td className={styles.mono}>{relativeTime(d.lastSeen)}</td>
                  <td>
                    <Link to={`/devices/${d.id}`} className={styles.linkBtn}>
                      Inspect →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
