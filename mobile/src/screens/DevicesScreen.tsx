import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { TechLabel } from '../components/TechLabel';
import { StatusPill } from '../components/StatusPill';
import { Icon } from '../components/Icon';
import { colors, radii, spacing, typography } from '../theme';
import { useDevices } from '../lib/mockTelemetry';
import type { Device } from '../types';
import { formatRelativeTime } from '../lib/format';
import type { RootStackParamList } from '../../App';

export const DevicesScreen: React.FC = () => {
  const devices = useDevices();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Screen>
      <View style={styles.header}>
        <TechLabel>Fleet</TechLabel>
        <Text style={styles.title}>Devices</Text>
        <Text style={styles.subtitle}>
          Every Room Manager node on your network. Firmware reported by the last MQTT
          handshake.
        </Text>
      </View>

      <View style={styles.list}>
        {devices.map((device) => (
          <DeviceRow
            key={device.id}
            device={device}
            onPress={() => navigation.navigate('DeviceDetail', { deviceId: device.id })}
          />
        ))}
      </View>

      <View style={styles.legend}>
        <TechLabel>Hardware platform</TechLabel>
        <Text style={styles.legendBody}>
          ESP32 · DHT22 (RH/Temp) · MQ-2 (combustible gas) · 5 V relay block driving fan,
          humidifier and piezo alarm.
        </Text>
      </View>
    </Screen>
  );
};

interface DeviceRowProps {
  device: Device;
  onPress?: () => void;
}

const DeviceRow: React.FC<DeviceRowProps> = ({ device, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.rowName}>{device.name}</Text>
        <Text style={styles.rowLocation}>{device.location}</Text>
        <View style={styles.rowMetaRow}>
          <Text style={styles.idBadge}>{device.id.toUpperCase()}</Text>
          <Text style={styles.rowDot}>·</Text>
          <Text style={styles.rowFirmware}>fw {device.firmware}</Text>
          <Text style={styles.rowDot}>·</Text>
          <Text style={styles.rowFirmware}>last seen {formatRelativeTime(device.lastSeen)}</Text>
        </View>
      </View>
      <View style={styles.rowRight}>
        <StatusPill status={device.status} />
        <Icon name="chevron-right" color={colors.textMuted} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  header: {
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
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
    gap: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.borderProminent,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  rowLocation: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  rowMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
    gap: 4,
  },
  idBadge: {
    ...typography.mono,
    fontSize: 11,
    color: colors.textSecondary,
  },
  rowDot: {
    ...typography.caption,
    color: colors.textMuted,
    marginHorizontal: 2,
  },
  rowFirmware: {
    ...typography.mono,
    fontSize: 11,
    color: colors.textMuted,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legend: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  legendBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});
