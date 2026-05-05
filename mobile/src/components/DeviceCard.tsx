import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import type { Device, Telemetry } from '../types';
import { ActuatorBadge } from './ActuatorBadge';
import { Icon } from './Icon';
import { Sparkline } from './Sparkline';
import { StatusPill } from './StatusPill';
import { TechLabel } from './TechLabel';
import { formatGas, formatPercent, formatRelativeTime, formatTemperature } from '../lib/format';
import { useIsLive } from '../lib/mockTelemetry';
import { LivePill } from './LivePill';

export interface DeviceCardProps {
  device: Device;
  history: Telemetry[];
  onPress?: () => void;
}

/**
 * Primary list row on the dashboard. Compresses the most recent reading,
 * trend, and actuator state into a single tappable card. The chevron on
 * the right is purely a navigational affordance.
 */
export const DeviceCard: React.FC<DeviceCardProps> = ({ device, history, onPress }) => {
  const latest = history[history.length - 1];
  const humiditySeries = history.map((t) => t.humidity);
  const live = useIsLive(device.id);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{device.name}</Text>
            {live && <LivePill />}
          </View>
          <Text style={styles.location}>{device.location}</Text>
        </View>
        <StatusPill status={device.status} />
      </View>

      <View style={styles.statsRow}>
        <Stat label="Humidity" value={latest ? formatPercent(latest.humidity) : '—'} />
        <Stat label="Temp" value={latest ? formatTemperature(latest.temperature) : '—'} />
        <Stat label="Gas" value={latest ? formatGas(latest.gas) : '—'} />
      </View>

      <View style={styles.sparkRow}>
        <View style={styles.sparkMeta}>
          <TechLabel>Humidity · 60 samples</TechLabel>
          <Text style={styles.lastSeen}>
            Last seen {latest ? formatRelativeTime(latest.timestamp) : '—'}
          </Text>
        </View>
        <Sparkline data={humiditySeries} />
      </View>

      <View style={styles.footerRow}>
        <View style={styles.actuators}>
          <ActuatorBadge label="Fan" icon="fan" on={!!latest?.fanOn} />
          <ActuatorBadge label="Humidifier" icon="droplet" on={!!latest?.humidifierOn} />
          <ActuatorBadge label="Alarm" icon="alert" tone="danger" on={!!latest?.alarmOn} />
        </View>
        <Icon name="chevron-right" color={colors.textMuted} size={18} />
      </View>
    </Pressable>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.stat}>
    <TechLabel>{label}</TechLabel>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  pressed: {
    borderColor: colors.borderProminent,
    backgroundColor: colors.bgElevated,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  title: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  location: {
    ...typography.bodySm,
    color: colors.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 26,
    marginTop: spacing.xs,
  },
  sparkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
  },
  sparkMeta: {
    flex: 1,
  },
  lastSeen: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actuators: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    flex: 1,
  },
});
