import { useMemo, useState } from 'react';
import TechLabel from '../components/TechLabel';
import { useAlerts, useAlertsActions, useDevices } from '../lib/mockTelemetry';
import { formatTime, relativeTime } from '../lib/format';
import styles from './AlertsPage.module.css';
import type { AlertEvent, Severity } from '../types';

type FilterKey = 'all' | 'active' | 'resolved' | Severity;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'danger', label: 'Danger' },
  { key: 'warning', label: 'Warning' },
  { key: 'info', label: 'Info' },
  { key: 'resolved', label: 'Resolved' },
];

export default function AlertsPage(): JSX.Element {
  const alerts = useAlerts();
  const devices = useDevices();
  const { toggleResolved } = useAlertsActions();
  const [filter, setFilter] = useState<FilterKey>('all');

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (filter === 'all') return true;
      if (filter === 'active') return !a.resolved;
      if (filter === 'resolved') return a.resolved;
      return a.severity === filter;
    });
  }, [alerts, filter]);

  const counts = useMemo(() => {
    const active = alerts.filter((a) => !a.resolved);
    return {
      danger: active.filter((a) => a.severity === 'danger').length,
      warning: active.filter((a) => a.severity === 'warning').length,
      info: active.filter((a) => a.severity === 'info').length,
    };
  }, [alerts]);

  function deviceName(deviceId: string): string {
    return devices.find((d) => d.id === deviceId)?.name ?? deviceId;
  }

  function stripeClass(a: AlertEvent): string {
    if (a.severity === 'danger') return styles.stripeDanger;
    if (a.severity === 'warning') return styles.stripeWarning;
    return styles.stripeInfo;
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <TechLabel>Audit log</TechLabel>
          <h1 className={styles.title}>Alerts</h1>
          <p className={styles.lead}>
            Threshold crossings and actuator engagements, in chronological order. The most recent
            100 are kept in memory.
          </p>
        </div>
      </header>

      <section className={styles.summary}>
        <div className={styles.summaryCard}>
          <TechLabel>Active danger</TechLabel>
          <div className={`${styles.summaryValue} ${styles.summaryDanger}`}>{counts.danger}</div>
        </div>
        <div className={styles.summaryCard}>
          <TechLabel>Active warnings</TechLabel>
          <div className={`${styles.summaryValue} ${styles.summaryWarn}`}>{counts.warning}</div>
        </div>
        <div className={styles.summaryCard}>
          <TechLabel>Active info</TechLabel>
          <div className={`${styles.summaryValue} ${styles.summaryInfo}`}>{counts.info}</div>
        </div>
      </section>

      <div className={styles.filters}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className="pill pill-ghost"
            onClick={() => setFilter(f.key)}
            style={
              filter === f.key
                ? {
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-prominent)',
                    background: 'var(--bg-elevated)',
                  }
                : undefined
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>No alerts match this filter.</div>
      ) : (
        <ul className={styles.list}>
          {filtered.map((a) => (
            <li
              key={a.id}
              className={`${styles.item} ${a.resolved ? styles.itemResolved : ''}`}
            >
              <span className={`${styles.stripe} ${stripeClass(a)}`} />
              <div className={styles.body}>
                <div className={styles.row}>
                  <span className={styles.deviceName}>{deviceName(a.deviceId)}</span>
                  <span className={styles.dot}>· {a.type.replace(/_/g, ' ')}</span>
                </div>
                <div className={styles.message}>{a.message}</div>
                <div className={styles.meta}>
                  <span>{formatTime(a.timestamp)}</span>
                  <span>{relativeTime(a.timestamp)}</span>
                  <span>severity: {a.severity}</span>
                </div>
              </div>
              <div className={styles.controls}>
                <button className={styles.toggleBtn} onClick={() => toggleResolved(a.id)}>
                  {a.resolved ? 'Reopen' : 'Resolve'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
