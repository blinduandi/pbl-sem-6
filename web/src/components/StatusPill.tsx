import type { DeviceStatus } from '../types';
import styles from './StatusPill.module.css';

interface StatusPillProps {
  status: DeviceStatus;
  label?: string;
}

const labelMap: Record<DeviceStatus, string> = {
  online: 'Online',
  warning: 'Active',
  danger: 'Alarm',
  offline: 'Offline',
};

export default function StatusPill({ status, label }: StatusPillProps): JSX.Element {
  return (
    <span className={`${styles.pill} ${styles[status]}`}>
      <span className={styles.dot} />
      <span>{label ?? labelMap[status]}</span>
    </span>
  );
}
