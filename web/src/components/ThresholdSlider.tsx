import styles from './ThresholdSlider.module.css';

interface ThresholdSliderProps {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}

export default function ThresholdSlider({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: ThresholdSliderProps): JSX.Element {
  const handleRange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onChange(Number(e.target.value));
  };
  const handleNumeric = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const v = Number(e.target.value);
    if (Number.isFinite(v)) onChange(v);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <label className={styles.label}>{label}</label>
        {hint && <span className={styles.hint}>{hint}</span>}
      </div>
      <div className={styles.row}>
        <input
          className={styles.range}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleRange}
        />
        <input
          className={styles.numeric}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleNumeric}
        />
      </div>
      <div className={styles.bounds}>
        <span className={styles.bound}>
          min {min}
          {unit ?? ''}
        </span>
        <span className={styles.bound}>
          max {max}
          {unit ?? ''}
        </span>
      </div>
    </div>
  );
}
