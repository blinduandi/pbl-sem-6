import React from 'react';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme';

export interface LogoProps {
  size?: number;
}

/**
 * Mark used in the dashboard header. The "RM" wordmark sits inside a
 * solid brand-green disc, sized to the parent's font scale.
 */
export const Logo: React.FC<LogoProps> = ({ size = 36 }) => {
  const cx = size / 2;
  const cy = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={cx} cy={cy} r={size / 2} fill={colors.brandGreen} />
      <SvgText
        x={cx}
        y={cy + size * 0.12}
        fontFamily="Inter_500Medium"
        fontSize={size * 0.42}
        fill={colors.bgPage}
        textAnchor="middle"
      >
        RM
      </SvgText>
    </Svg>
  );
};
