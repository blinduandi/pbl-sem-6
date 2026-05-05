import React from 'react';
import Svg, { Line, Polyline, Rect } from 'react-native-svg';
import { colors } from '../theme';

export interface ComfortBand {
  min: number;
  max: number;
}

export interface LineChartProps {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  band?: ComfortBand;
  bandFill?: string;
  bandStroke?: string;
  yMin?: number;
  yMax?: number;
  gridLines?: number;
}

/**
 * Axis-less line chart with an optional comfort band overlay. The band
 * appears behind the trace so the trend reads cleanly against it.
 */
export const LineChart: React.FC<LineChartProps> = ({
  data,
  width = 200,
  height = 120,
  stroke = colors.brandGreen,
  band,
  bandFill = colors.brandGreenGlow,
  bandStroke = colors.brandGreenBorder,
  yMin,
  yMax,
  gridLines = 3,
}) => {
  if (data.length === 0) {
    return <Svg width={width} height={height} />;
  }
  const inferredMin = Math.min(...data, ...(band ? [band.min] : []));
  const inferredMax = Math.max(...data, ...(band ? [band.max] : []));
  const padding = (inferredMax - inferredMin || 1) * 0.12;
  const lo = yMin ?? inferredMin - padding;
  const hi = yMax ?? inferredMax + padding;
  const range = hi - lo === 0 ? 1 : hi - lo;

  const project = (value: number, index: number, total: number): { x: number; y: number } => {
    const x = total === 1 ? width / 2 : (index / (total - 1)) * width;
    const y = (1 - (value - lo) / range) * height;
    return { x, y };
  };

  const points = data
    .map((value, index) => {
      const { x, y } = project(value, index, data.length);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  const grid: number[] = [];
  for (let i = 1; i <= gridLines; i += 1) {
    grid.push((height / (gridLines + 1)) * i);
  }

  let bandRect: { y: number; height: number } | null = null;
  if (band) {
    const top = ((hi - band.max) / range) * height;
    const bottom = ((hi - band.min) / range) * height;
    bandRect = { y: top, height: Math.max(0, bottom - top) };
  }

  return (
    <Svg width={width} height={height}>
      {bandRect && (
        <>
          <Rect x={0} y={bandRect.y} width={width} height={bandRect.height} fill={bandFill} />
          <Line
            x1={0}
            x2={width}
            y1={bandRect.y}
            y2={bandRect.y}
            stroke={bandStroke}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <Line
            x1={0}
            x2={width}
            y1={bandRect.y + bandRect.height}
            y2={bandRect.y + bandRect.height}
            stroke={bandStroke}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        </>
      )}
      {grid.map((y, i) => (
        <Line
          key={`g-${i}`}
          x1={0}
          x2={width}
          y1={y}
          y2={y}
          stroke={colors.borderSubtle}
          strokeWidth={1}
        />
      ))}
      <Polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
