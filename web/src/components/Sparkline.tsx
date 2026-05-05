import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  domain?: [number | 'auto', number | 'auto'];
}

interface Point {
  i: number;
  v: number;
}

export default function Sparkline({
  data,
  color = 'var(--brand-green)',
  height = 48,
  domain = ['auto', 'auto'],
}: SparklineProps): JSX.Element {
  const points: Point[] = data.map((v, i) => ({ i, v }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 0, bottom: 4, left: 0 }}>
          <YAxis hide domain={domain} />
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
