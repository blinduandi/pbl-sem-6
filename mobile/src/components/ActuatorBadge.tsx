import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import { Icon, IconName } from './Icon';

export interface ActuatorBadgeProps {
  label: string;
  on: boolean;
  icon: IconName;
  tone?: 'neutral' | 'warning' | 'danger';
}

/**
 * Compact pill that mirrors a physical relay — fan, humidifier, alarm.
 * Displays the actuator label with a leading icon and a trailing dot
 * encoding the on/off state.
 */
export const ActuatorBadge: React.FC<ActuatorBadgeProps> = ({
  label,
  on,
  icon,
  tone = 'neutral',
}) => {
  const accent = on
    ? tone === 'danger'
      ? colors.danger
      : tone === 'warning'
      ? colors.warning
      : colors.brandGreen
    : colors.textMuted;

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: on ? accent : colors.borderDefault,
          backgroundColor: on ? withAlpha(accent, 0.08) : colors.bgElevated,
        },
      ]}
    >
      <Icon name={icon} size={14} color={on ? accent : colors.textMuted} />
      <Text style={[styles.label, { color: on ? colors.textPrimary : colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.state, { color: accent }]}>{on ? 'ON' : 'OFF'}</Text>
    </View>
  );
};

const withAlpha = (hex: string, alpha: number): string => {
  // Accepts known palette hex values; falls back gracefully.
  if (hex === colors.brandGreen) return `rgba(62, 207, 142, ${alpha})`;
  if (hex === colors.warning) return `rgba(245, 165, 36, ${alpha})`;
  if (hex === colors.danger) return `rgba(229, 72, 77, ${alpha})`;
  return colors.bgElevated;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  label: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
    marginLeft: spacing.xs + 2,
    marginRight: spacing.sm,
  },
  state: {
    ...typography.techLabel,
    fontSize: 10,
  },
});
