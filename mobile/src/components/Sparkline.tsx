import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { colors } from '../theme';

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
}

/**
 * Lightweight inline trendline. Samples a numeric series, normalises to
 * the available box, and emits a single polyline.
 */
export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 110,
  height = 32,
  stroke = colors.brandGreen,
  strokeWidth = 1.5,
}) => {
  if (data.length < 2) {
    return <View style={{ width, height }} />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  const stepX = width / (data.length - 1);
  const padY = strokeWidth + 1;
  const usableY = height - padY * 2;
  const points = data
    .map((value, index) => {
      const normalised = (value - min) / range;
      const x = index * stepX;
      const y = padY + (1 - normalised) * usableY;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
