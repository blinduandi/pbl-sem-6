import React from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import { colors } from '../theme';

export type IconName =
  | 'home'
  | 'bell'
  | 'grid'
  | 'settings'
  | 'fan'
  | 'droplet'
  | 'gas'
  | 'wifi'
  | 'chevron-right'
  | 'check'
  | 'alert';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Lucide-flavoured 24x24 line icons rendered inline as SVG so the app
 * never depends on an icon font or PNG asset bundle.
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  color = colors.textSecondary,
  strokeWidth = 1.5,
}) => {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && (
        <>
          <Path d="M3 11.5L12 4l9 7.5" {...common} />
          <Path d="M5 10.5V20h14V10.5" {...common} />
          <Path d="M10 20v-5h4v5" {...common} />
        </>
      )}
      {name === 'bell' && (
        <>
          <Path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" {...common} />
          <Path d="M10.5 18a1.7 1.7 0 0 0 3 0" {...common} />
        </>
      )}
      {name === 'grid' && (
        <>
          <Rect x={3} y={3} width={7} height={7} rx={1.5} {...common} />
          <Rect x={14} y={3} width={7} height={7} rx={1.5} {...common} />
          <Rect x={3} y={14} width={7} height={7} rx={1.5} {...common} />
          <Rect x={14} y={14} width={7} height={7} rx={1.5} {...common} />
        </>
      )}
      {name === 'settings' && (
        <>
          <Circle cx={12} cy={12} r={3} {...common} />
          <Path
            d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.7l.1.1a1.7 1.7 0 0 0 1.8.3h.1A1.7 1.7 0 0 0 10 3.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1A1.7 1.7 0 0 0 20.5 10H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
            {...common}
          />
        </>
      )}
      {name === 'fan' && (
        <>
          <Circle cx={12} cy={12} r={2} {...common} />
          <Path d="M12 10c0-3-1-6-3-6s-3 2-3 4 1 4 3 4 3-2 3-2z" {...common} />
          <Path d="M14 14c0 3 1 6 3 6s3-2 3-4-1-4-3-4-3 2-3 2z" {...common} />
          <Path d="M10 14c-3 0-6 1-6 3s2 3 4 3 4-1 4-3-2-3-2-3z" {...common} />
          <Path d="M14 10c3 0 6-1 6-3s-2-3-4-3-4 1-4 3 2 3 2 3z" {...common} />
        </>
      )}
      {name === 'droplet' && (
        <Path d="M12 3s-6 6-6 11a6 6 0 0 0 12 0c0-5-6-11-6-11z" {...common} />
      )}
      {name === 'gas' && (
        <>
          <Path d="M9 21V8a3 3 0 1 1 6 0v13" {...common} />
          <Path d="M6 21h12" {...common} />
          <Path d="M9 11h6" {...common} />
          <Path d="M9 15h6" {...common} />
        </>
      )}
      {name === 'wifi' && (
        <>
          <Path d="M2 9a14 14 0 0 1 20 0" {...common} />
          <Path d="M5 12.5a10 10 0 0 1 14 0" {...common} />
          <Path d="M8.5 16a5 5 0 0 1 7 0" {...common} />
          <Circle cx={12} cy={19} r={0.8} fill={color} stroke="none" />
        </>
      )}
      {name === 'chevron-right' && <Polyline points="9 6 15 12 9 18" {...common} />}
      {name === 'check' && <Polyline points="4 12 10 18 20 6" {...common} />}
      {name === 'alert' && (
        <>
          <Path d="M10.3 3.3 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0z" {...common} />
          <Line x1={12} y1={9} x2={12} y2={13} {...common} />
          <Circle cx={12} cy={17} r={0.8} fill={color} stroke="none" />
        </>
      )}
    </Svg>
  );
};
