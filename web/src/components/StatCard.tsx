import type { ReactNode } from 'react';
import Sparkline from './Sparkline';
import TechLabel from './TechLabel';
import styles from './StatCard.module.css';

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  delta?: { value: string; direction: 'up' | 'down' | 'flat'; warn?: boolean };
  spark?: { data: number[]; color?: string };
  meta?: ReactNode;
  rightSlot?: ReactNode;
}

export default function StatCard({
  label,
  value,
  unit,
  delta,
  spark,
  meta,
  rightSlot,
}: StatCardProps): JSX.Element {
  const deltaClass = delta
    ? delta.warn
      ? styles.deltaWarn
      : delta.direction === 'up'
        ? styles.deltaUp
        : delta.direction === 'down'
          ? styles.deltaDown
          : ''
    : '';

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <TechLabel>{label}</TechLabel>
        {rightSlot}
      </div>
      <div className={styles.value}>
        <span>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      {delta && <div className={`${styles.delta} ${deltaClass}`}>{delta.value} last 2m</div>}
      {spark && (
        <div className={styles.spark}>
          <Sparkline data={spark.data} color={spark.color} height={40} />
        </div>
      )}
      {meta && <div className={styles.foot}>{meta}</div>}
    </div>
  );
}
