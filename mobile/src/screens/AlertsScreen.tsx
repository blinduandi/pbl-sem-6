import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { TechLabel } from '../components/TechLabel';
import { colors, radii, spacing, typography } from '../theme';
import { telemetryStore, useAlerts } from '../lib/mockTelemetry';
import type { AlertEvent, Severity } from '../types';
import { formatRelativeTime } from '../lib/format';

const severityColor: Record<Severity, string> = {
  info: colors.info,
  warning: colors.warning,
  danger: colors.danger,
};

export const AlertsScreen: React.FC = () => {
  const alerts = useAlerts();

  const grouped = useMemo(() => {
    const active = alerts.filter((a) => !a.resolved);
    const resolved = alerts.filter((a) => a.resolved).slice(0, 24);
    return { active, resolved };
  }, [alerts]);

  return (
    <Screen>
      <View style={styles.headerRow}>
        <TechLabel>Event stream</TechLabel>
        <Text style={styles.title}>Alerts</Text>
        <Text style={styles.subtitle}>
          The same threshold transitions that drive the firmware also surface here, oldest first
          within each group.
        </Text>
      </View>

      <SectionHeader
        title="Active"
        description={
          grouped.active.length === 0
            ? 'No outstanding events. Sit back.'
            : `${grouped.active.length} unresolved`
        }
      />
      {grouped.active.length === 0 ? (
        <EmptyState
          title="All clear"
          body="Devices report within the comfort band. Active events will appear here when sensors trip a threshold."
        />
      ) : (
        <View style={styles.list}>
          {grouped.active.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </View>
      )}

      <SectionHeader title="Recently resolved" description="Last 24 hours · most recent first" />
      {grouped.resolved.length === 0 ? (
        <EmptyState title="Nothing yet" body="Resolved events show up here once an actuator clears." />
      ) : (
        <View style={styles.list}>
          {grouped.resolved.map((alert) => (
            <AlertRow key={alert.id} alert={alert} muted />
          ))}
        </View>
      )}
    </Screen>
  );
};

interface AlertRowProps {
  alert: AlertEvent;
  muted?: boolean;
}

const AlertRow: React.FC<AlertRowProps> = ({ alert, muted = false }) => {
  const accent = severityColor[alert.severity];
  const device = telemetryStore.getDevice(alert.deviceId);

  return (
    <View style={[styles.row, muted && styles.rowMuted]}>
      <View style={[styles.stripe, { backgroundColor: accent }]} />
      <View style={styles.rowBody}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowDevice} numberOfLines={1}>
            {device?.name ?? alert.deviceId}
          </Text>
          <Text style={styles.rowTime}>{formatRelativeTime(alert.timestamp)}</Text>
        </View>
        <Text style={[styles.rowMessage, muted && styles.rowMessageMuted]}>{alert.message}</Text>
        <View style={styles.rowFooter}>
          <Text style={[styles.rowMeta, { color: accent }]}>
            {alert.severity.toUpperCase()}
          </Text>
          <Text style={styles.rowMetaDot}>·</Text>
          <Text style={styles.rowMeta}>{alert.type.replace('_', ' ')}</Text>
          {muted && (
            <>
              <Text style={styles.rowMetaDot}>·</Text>
              <Text style={[styles.rowMeta, { color: colors.brandGreen }]}>Resolved</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const EmptyState: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <View style={styles.empty}>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyBody}>{body}</Text>
  </View>
);

const styles = StyleSheet.create({
  headerRow: {
    gap: spacing.xs,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 32,
    lineHeight: 36,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  list: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
  },
  rowMuted: {
    backgroundColor: colors.bgPage,
  },
  stripe: {
    width: 3,
  },
  rowBody: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowDevice: {
    ...typography.cardTitle,
    fontSize: 17,
    lineHeight: 22,
    color: colors.textPrimary,
    flex: 1,
    paddingRight: spacing.md,
  },
  rowTime: {
    ...typography.caption,
    color: colors.textMuted,
  },
  rowMessage: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  rowMessageMuted: {
    color: colors.textMuted,
  },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  rowMeta: {
    ...typography.techLabel,
    color: colors.textMuted,
  },
  rowMetaDot: {
    ...typography.caption,
    color: colors.textMuted,
  },
  empty: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
});
