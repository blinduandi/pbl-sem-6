import React, { useMemo } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { TechLabel } from '../components/TechLabel';
import { StatusPill } from '../components/StatusPill';
import { LivePill } from '../components/LivePill';
import { ActuatorBadge } from '../components/ActuatorBadge';
import { LineChart } from '../components/LineChart';
import { Icon } from '../components/Icon';
import { colors, radii, spacing, typography } from '../theme';
import { telemetryStore, useIsLive, useLatestTelemetry, useTelemetry } from '../lib/mockTelemetry';
import {
  formatGas,
  formatPercent,
  formatRelativeTime,
  formatRssi,
  formatTemperature,
} from '../lib/format';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'DeviceDetail'>;

// Page padding (xl) on each side + a little internal card padding mean the
// chart never gets the full screen width — leave room for it.
const SCREEN_WIDTH = Dimensions.get('window').width;
const WIDE_CHART_WIDTH = Math.max(220, Math.min(320, SCREEN_WIDTH - 80));
const NARROW_CHART_WIDTH = Math.max(120, Math.min(160, (SCREEN_WIDTH - 80) / 2 - 12));

export const DeviceDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { deviceId } = route.params;
  const device = telemetryStore.getDevice(deviceId);
  const history = useTelemetry(deviceId);
  const latest = useLatestTelemetry(deviceId);
  const live = useIsLive(deviceId);

  const series = useMemo(
    () => ({
      humidity: history.map((t) => t.humidity),
      temperature: history.map((t) => t.temperature),
      gas: history.map((t) => t.gas),
    }),
    [history],
  );

  if (!device) {
    return (
      <Screen>
        <Text style={styles.missingTitle}>Device not found</Text>
        <Text style={styles.missingBody}>That device id is no longer in the registry.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <View style={styles.backIcon}>
          <Icon name="chevron-right" color={colors.textMuted} size={16} />
        </View>
        <Text style={styles.backLabel}>All rooms</Text>
      </Pressable>

      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <TechLabel>{device.id.toUpperCase()}</TechLabel>
            <Text style={styles.headerName}>{device.name}</Text>
            <Text style={styles.headerLocation}>{device.location}</Text>
          </View>
          <View style={styles.headerBadges}>
            {live && <LivePill />}
            <StatusPill status={device.status} />
          </View>
        </View>
        <View style={styles.headerMeta}>
          <MetaCell label="Firmware" value={device.firmware} mono />
          <MetaCell
            label="Last reading"
            value={latest ? formatRelativeTime(latest.timestamp) : '—'}
          />
          <MetaCell label="RSSI" value={latest ? formatRssi(latest.wifiRssi) : '—'} mono />
        </View>
      </View>

      <View style={styles.statRow}>
        <StatPanel
          label="Humidity"
          value={latest ? formatPercent(latest.humidity) : '—'}
          band={{ min: 40, max: 60 }}
          data={series.humidity}
          accent={colors.brandGreen}
        />
        <StatPanel
          label="Temperature"
          value={latest ? formatTemperature(latest.temperature) : '—'}
          data={series.temperature}
          accent={colors.info}
        />
      </View>

      <View style={styles.fullWidth}>
        <StatPanel
          label="Combustible gas"
          value={latest ? formatGas(latest.gas) : '—'}
          data={series.gas}
          accent={colors.warning}
          wide
        />
      </View>

      <View style={styles.actuatorCard}>
        <TechLabel>Live actuators</TechLabel>
        <Text style={styles.actuatorTitle}>Driven by hysteresis on every tick</Text>
        <View style={styles.actuatorRow}>
          <ActuatorBadge label="Vent fan" icon="fan" on={!!latest?.fanOn} />
          <ActuatorBadge label="Humidifier" icon="droplet" on={!!latest?.humidifierOn} />
          <ActuatorBadge label="Gas alarm" icon="alert" tone="danger" on={!!latest?.alarmOn} />
        </View>
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View>
            <TechLabel>Last 60 readings</TechLabel>
            <Text style={styles.chartTitle}>Humidity trace</Text>
          </View>
          <Text style={styles.chartLegend}>40–60 % comfort band</Text>
        </View>
        <LineChart
          data={series.humidity}
          width={WIDE_CHART_WIDTH}
          height={160}
          band={{ min: 40, max: 60 }}
        />
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View>
            <TechLabel>Last 60 readings</TechLabel>
            <Text style={styles.chartTitle}>Combustible gas</Text>
          </View>
          <Text style={styles.chartLegend}>danger above 300 ppm</Text>
        </View>
        <LineChart
          data={series.gas}
          width={WIDE_CHART_WIDTH}
          height={160}
          stroke={colors.warning}
          band={{ min: 0, max: 300 }}
          bandFill="rgba(245, 165, 36, 0.06)"
          bandStroke="rgba(245, 165, 36, 0.32)"
        />
      </View>
    </Screen>
  );
};

interface MetaCellProps {
  label: string;
  value: string;
  mono?: boolean;
}

const MetaCell: React.FC<MetaCellProps> = ({ label, value, mono = false }) => (
  <View style={styles.metaCell}>
    <TechLabel>{label}</TechLabel>
    <Text style={mono ? styles.metaValueMono : styles.metaValue}>{value}</Text>
  </View>
);

interface StatPanelProps {
  label: string;
  value: string;
  data: number[];
  accent: string;
  band?: { min: number; max: number };
  wide?: boolean;
}

const StatPanel: React.FC<StatPanelProps> = ({ label, value, data, accent, band, wide }) => (
  <View style={[styles.panel, wide && styles.panelWide]}>
    <TechLabel>{label}</TechLabel>
    <Text style={styles.panelValue}>{value}</Text>
    <View style={styles.panelChart}>
      <LineChart
        data={data}
        width={wide ? WIDE_CHART_WIDTH : NARROW_CHART_WIDTH}
        height={wide ? 90 : 70}
        stroke={accent}
        band={band}
        bandFill="rgba(62, 207, 142, 0.08)"
        bandStroke="rgba(62, 207, 142, 0.32)"
        gridLines={2}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  backIcon: {
    transform: [{ rotate: '180deg' }],
  },
  backLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  fullWidth: {
    width: '100%',
  },
  headerCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  headerBadges: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  headerName: {
    ...typography.heading,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  headerLocation: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  headerMeta: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  metaCell: {
    flex: 1,
    gap: 2,
  },
  metaValue: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  metaValueMono: {
    ...typography.mono,
    color: colors.textPrimary,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  panel: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  panelWide: {
    flex: 0,
    width: '100%',
  },
  panelValue: {
    ...typography.heading,
    fontSize: 28,
    lineHeight: 32,
    color: colors.textPrimary,
  },
  panelChart: {
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  actuatorCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  actuatorTitle: {
    ...typography.body,
    color: colors.textPrimary,
  },
  actuatorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  chartCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.xl,
    gap: spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  chartTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
    marginTop: 2,
  },
  chartLegend: {
    ...typography.caption,
    color: colors.textMuted,
  },
  missingTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  missingBody: {
    ...typography.body,
    color: colors.textMuted,
  },
});
