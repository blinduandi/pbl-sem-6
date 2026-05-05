import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Link } from 'react-router-dom';
import Logo from './Logo';
import { telemetryStore, useAlerts, useDevices } from '../lib/mockTelemetry';
import styles from './AppShell.module.css';

type IconName = 'dashboard' | 'devices' | 'alerts' | 'thresholds';

interface NavItem {
  to: string;
  label: string;
  end: boolean;
  icon: IconName;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', end: true, icon: 'dashboard' },
  { to: '/devices', label: 'Devices', end: false, icon: 'devices' },
  { to: '/alerts', label: 'Alerts', end: false, icon: 'alerts' },
  { to: '/thresholds', label: 'Thresholds', end: false, icon: 'thresholds' },
];

function NavIcon({ name }: { name: IconName }): JSX.Element {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (name) {
    case 'dashboard':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="8" height="9" rx="1.5" />
          <rect x="13" y="3" width="8" height="5" rx="1.5" />
          <rect x="13" y="10" width="8" height="11" rx="1.5" />
          <rect x="3" y="14" width="8" height="7" rx="1.5" />
        </svg>
      );
    case 'devices':
      return (
        <svg {...common}>
          <rect x="5" y="5" width="14" height="14" rx="2" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
          <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
        </svg>
      );
    case 'alerts':
      return (
        <svg {...common}>
          <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 8H4c0-2 2-3 2-8Z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
      );
    case 'thresholds':
      return (
        <svg {...common}>
          <path d="M4 7h10" />
          <path d="M18 7h2" />
          <circle cx="16" cy="7" r="2" />
          <path d="M4 17h4" />
          <path d="M12 17h8" />
          <circle cx="10" cy="17" r="2" />
        </svg>
      );
  }
}

function useAnyLive(deviceIds: string[]): boolean {
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = telemetryStore.subscribeLive(() => setTick((n) => n + 1));
    return unsub;
  }, []);
  // Re-run on every render — telemetryStore.isLive is cheap (Map lookup).
  return deviceIds.some((id) => telemetryStore.isLive(id));
}

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps): JSX.Element {
  const devices = useDevices();
  const alerts = useAlerts();
  const anyLive = useAnyLive(devices.map((d) => d.id));
  const onlineCount = devices.filter((d) => d.status !== 'offline').length;
  const activeAlarms = alerts.filter((a) => !a.resolved && a.severity === 'danger').length;
  const statusTitle =
    activeAlarms > 0
      ? `${activeAlarms} active alarm${activeAlarms === 1 ? '' : 's'}`
      : `${onlineCount} device${onlineCount === 1 ? '' : 's'} online`;
  const liveTitle = anyLive
    ? 'At least one device is streaming live data via the bridge'
    : 'All devices on simulator data';

  return (
    <div className={styles.shell}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link to="/" className={styles.brand} aria-label="Room Manager">
            <Logo size={28} />
          </Link>

          <div className={styles.links}>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                aria-label={item.label}
                title={item.label}
                className={({ isActive }) =>
                  isActive ? `${styles.link} ${styles.linkActive}` : styles.link
                }
              >
                <NavIcon name={item.icon} />
              </NavLink>
            ))}
          </div>

          <div className={styles.right}>
            <span
              className={`${styles.liveTag} ${anyLive ? styles.liveTagActive : ''}`}
              title={liveTitle}
              aria-label={liveTitle}
            >
              <span className={styles.liveTagDot} />
              Live
            </span>
            <span
              className={styles.statusPill}
              title={statusTitle}
              aria-label={statusTitle}
            >
              <span
                className={`${styles.statusDot} ${
                  activeAlarms > 0 ? styles.statusDanger : ''
                }`}
              />
            </span>
          </div>
        </div>
      </nav>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        Room Manager · ESP32 firmware <span>v1.4.2</span> · indoor air automation
      </footer>
    </div>
  );
}
