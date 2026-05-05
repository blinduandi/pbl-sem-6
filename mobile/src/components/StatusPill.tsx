import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import type { DeviceStatus } from '../types';

export interface StatusPillProps {
  status: DeviceStatus | 'ok' | 'idle';
  label?: string;
}

const palette: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  online: {
    bg: 'rgba(62, 207, 142, 0.08)',
    border: colors.brandGreenBorder,
    text: colors.brandGreen,
    dot: colors.brandGreen,
  },
  ok: {
    bg: 'rgba(62, 207, 142, 0.08)',
    border: colors.brandGreenBorder,
    text: colors.brandGreen,
    dot: colors.brandGreen,
  },
  warning: {
    bg: 'rgba(245, 165, 36, 0.08)',
    border: 'rgba(245, 165, 36, 0.32)',
    text: colors.warning,
    dot: colors.warning,
  },
  danger: {
    bg: 'rgba(229, 72, 77, 0.08)',
    border: 'rgba(229, 72, 77, 0.32)',
    text: colors.danger,
    dot: colors.danger,
  },
  offline: {
    bg: 'rgba(137, 137, 137, 0.08)',
    border: colors.borderProminent,
    text: colors.textMuted,
    dot: colors.textMuted,
  },
  idle: {
    bg: 'rgba(137, 137, 137, 0.08)',
    border: colors.borderProminent,
    text: colors.textMuted,
    dot: colors.textMuted,
  },
};

const labelFor = (status: StatusPillProps['status']): string => {
  switch (status) {
    case 'online':
      return 'Online';
    case 'offline':
      return 'Offline';
    case 'warning':
      return 'Warning';
    case 'danger':
      return 'Danger';
    case 'ok':
      return 'OK';
    case 'idle':
      return 'Idle';
    default:
      return status;
  }
};

/**
 * Coloured pill used in headers and lists to convey device or alert
 * state. Always rendered with a small dot leading the label.
 */
export const StatusPill: React.FC<StatusPillProps> = ({ status, label }) => {
  const tones = palette[status] ?? palette.idle;
  return (
    <View style={[styles.pill, { backgroundColor: tones.bg, borderColor: tones.border }]}>
      <View style={[styles.dot, { backgroundColor: tones.dot }]} />
      <Text style={[styles.text, { color: tones.text }]}>{label ?? labelFor(status)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    marginRight: spacing.xs + 2,
  },
  text: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
  },
});
