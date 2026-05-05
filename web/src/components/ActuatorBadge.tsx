import styles from './ActuatorBadge.module.css';

type Kind = 'fan' | 'humidifier' | 'alarm';

interface ActuatorBadgeProps {
  kind: Kind;
  on: boolean;
}

function FanIcon({ spin }: { spin: boolean }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${styles.icon} ${spin ? styles.iconSpin : ''}`}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="2" />
      <path d="M12 10c0-3 1-6 4-6 2 0 3 1 3 3 0 3-3 4-7 5" />
      <path d="M12 14c0 3-1 6-4 6-2 0-3-1-3-3 0-3 3-4 7-5" />
      <path d="M10 12c-3 0-6-1-6-4 0-2 1-3 3-3 3 0 4 3 5 7" />
      <path d="M14 12c3 0 6 1 6 4 0 2-1 3-3 3-3 0-4-3-5-7" />
    </svg>
  );
}

function DropletIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={styles.icon}
      aria-hidden="true"
    >
      <path d="M12 3s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11z" />
      <path d="M9 14a3 3 0 0 0 3 3" opacity={0.6} />
    </svg>
  );
}

function BellIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={styles.icon}
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0v4l1.5 3h-15L6 12V8z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}

const labels: Record<Kind, string> = {
  fan: 'Fan',
  humidifier: 'Humidifier',
  alarm: 'Alarm',
};

export default function ActuatorBadge({ kind, on }: ActuatorBadgeProps): JSX.Element {
  const className = [
    styles.badge,
    on ? styles.on : '',
    on && kind === 'alarm' ? styles.alarmOn : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={className}>
      {kind === 'fan' && <FanIcon spin={on} />}
      {kind === 'humidifier' && <DropletIcon />}
      {kind === 'alarm' && <BellIcon />}
      <span>{labels[kind]}</span>
      <span className={styles.state}>{on ? 'ON' : 'OFF'}</span>
    </span>
  );
}
