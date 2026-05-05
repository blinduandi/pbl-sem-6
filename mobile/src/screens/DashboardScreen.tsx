import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Logo } from '../components/Logo';
import { TechLabel } from '../components/TechLabel';
import { SectionHeader } from '../components/SectionHeader';
import { DeviceCard } from '../components/DeviceCard';
import { StatBlock } from '../components/StatBlock';
import { colors, radii, spacing, typography } from '../theme';
import { telemetryStore, useAlerts, useDevices } from '../lib/mockTelemetry';
import { formatPercent } from '../lib/format';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Tabs'>;

export const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const devices = useDevices();
  const alerts = useAlerts();

  const summary = useMemo(() => {
    const online = devices.filter((d) => d.status !== 'offline').length;
    const activeAlerts = alerts.filter((a) => !a.resolved).length;
    const latestReadings = devices
      .map((d) => telemetryStore.getLatest(d.id))
      .filter((t): t is NonNullable<typeof t> => !!t);
    const avgHumidity =
      latestReadings.length === 0
        ? 0
        : latestReadings.reduce((acc, t) => acc + t.humidity, 0) / latestReadings.length;
    return { online, total: devices.length, activeAlerts, avgHumidity };
  }, [devices, alerts]);

  return (
    <Screen>
      <View style={styles.heroRow}>
        <Logo />
        <View style={styles.heroMeta}>
          <TechLabel>Room Manager · v1.4.2</TechLabel>
          <Text style={styles.tagline}>ESP32 indoor air quality network</Text>
        </View>
      </View>

      <Text style={styles.hero}>Air quality, automated.</Text>
      <Text style={styles.subhero}>
        Live readings from every Room Manager node. Fan, humidifier and gas alarm respond on
        their own — you only check in when something interesting happens.
      </Text>

      <View style={styles.summaryRow}>
        <StatBlock
          label="Devices online"
          value={`${summary.online}`}
          unit={`/ ${summary.total}`}
          emphasised
        />
        <StatBlock
          label="Active alerts"
          value={`${summary.activeAlerts}`}
          unit={summary.activeAlerts === 1 ? 'event' : 'events'}
        />
      </View>

      <View style={styles.summaryWide}>
        <StatBlock label="Average humidity" value={formatPercent(summary.avgHumidity)} unit="RH" />
      </View>

      <SectionHeader
        title="Rooms"
        description="Tap a card to inspect the live trace for that room."
      />

      <View style={styles.list}>
        {devices.map((device) => {
          const history = telemetryStore.getHistory(device.id);
          return (
            <DeviceCard
              key={device.id}
              device={device}
              history={history}
              onPress={() => navigation.navigate('DeviceDetail', { deviceId: device.id })}
            />
          );
        })}
      </View>

      <View style={styles.footer}>
        <TechLabel>Telemetry tick · 2.0 s</TechLabel>
        <Text style={styles.footerNote}>
          Mock broker — wire up MQTT in <Text style={styles.code}>mockTelemetry.ts</Text>.
        </Text>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroMeta: {
    flex: 1,
  },
  tagline: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  hero: {
    ...typography.hero,
    color: colors.textPrimary,
    marginTop: -spacing.sm,
  },
  subhero: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: -spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryWide: {
    marginTop: -spacing.sm,
  },
  list: {
    gap: spacing.lg,
    marginTop: -spacing.sm,
  },
  footer: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  footerNote: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  code: {
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.textSecondary,
  },
});
