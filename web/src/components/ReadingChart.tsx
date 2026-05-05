import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Telemetry } from '../types';
import { formatClock } from '../lib/format';

type Metric = 'humidity' | 'temperature' | 'gas';

interface ReadingChartProps {
  data: Telemetry[];
  metric: Metric;
  color?: string;
  unit: string;
  height?: number;
  band?: { from: number; to: number; label?: string };
  thresholdLine?: { value: number; label: string };
  domain?: [number | 'auto' | 'dataMin' | 'dataMax', number | 'auto' | 'dataMin' | 'dataMax'];
}

interface ChartPoint {
  ts: string;
  label: string;
  value: number;
}

interface TooltipPayload {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  unit: string;
}

function CustomTooltip({ active, payload, label, unit }: CustomTooltipProps): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const v = payload[0]?.value ?? 0;
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-prominent)',
        borderRadius: 8,
        padding: '8px 12px',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--text-primary)',
        minWidth: 120,
      }}
    >
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div>
        {v.toFixed(1)} <span style={{ color: 'var(--text-muted)' }}>{unit}</span>
      </div>
    </div>
  );
}

export default function ReadingChart({
  data,
  metric,
  color,
  unit,
  height = 240,
  band,
  thresholdLine,
  domain = ['auto', 'auto'],
}: ReadingChartProps): JSX.Element {
  const colorByMetric: Record<Metric, string> = {
    humidity: 'var(--brand-green)',
    temperature: 'var(--text-primary)',
    gas: 'var(--danger)',
  };
  const stroke = color ?? colorByMetric[metric];

  const points: ChartPoint[] = data.map((t) => ({
    ts: t.timestamp,
    label: formatClock(t.timestamp),
    value: t[metric],
  }));

  const gradId = `grad-${metric}`;

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.18} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="var(--text-muted)"
            tickLine={false}
            axisLine={{ stroke: 'var(--border-subtle)' }}
            interval="preserveStartEnd"
            minTickGap={48}
            style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}
          />
          <YAxis
            stroke="var(--text-muted)"
            tickLine={false}
            axisLine={false}
            domain={domain}
            width={48}
            style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}
          />
          {band && (
            <ReferenceArea
              y1={band.from}
              y2={band.to}
              fill="rgba(62, 207, 142, 0.06)"
              stroke="rgba(62, 207, 142, 0.18)"
              strokeDasharray="3 4"
              ifOverflow="extendDomain"
              label={
                band.label
                  ? {
                      value: band.label,
                      position: 'insideTopLeft',
                      fill: 'var(--text-muted)',
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                    }
                  : undefined
              }
            />
          )}
          {thresholdLine && (
            <ReferenceLine
              y={thresholdLine.value}
              stroke="var(--warning)"
              strokeDasharray="4 4"
              label={{
                value: thresholdLine.label,
                position: 'right',
                fill: 'var(--warning)',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
              }}
            />
          )}
          <Tooltip
            content={<CustomTooltip unit={unit} />}
            cursor={{ stroke: 'var(--border-prominent)', strokeDasharray: '3 4' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#${gradId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
