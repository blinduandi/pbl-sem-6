import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { TechLabel } from '../components/TechLabel';
import { SectionHeader } from '../components/SectionHeader';
import { Pill } from '../components/Pill';
import { ThresholdSlider } from '../components/ThresholdSlider';
import { Icon } from '../components/Icon';
import { colors, radii, spacing, typography } from '../theme';
import { useThresholds } from '../lib/mockTelemetry';
import type { Thresholds } from '../types';

const HARDWARE_BOM: Array<{ label: string; spec: string }> = [
  { label: 'ESP32', spec: 'WROOM-32 · dual-core 240 MHz' },
  { label: 'DHT22', spec: '±2 % RH · ±0.5 °C' },
  { label: 'MQ-2', spec: 'LPG / smoke / CO · 200–10000 ppm' },
  { label: 'Relay', spec: '4-channel · 5 V opto-isolated' },
];

export const SettingsScreen: React.FC = () => {
  const { thresholds, setThresholds } = useThresholds();
  const [draft, setDraft] = useState<Thresholds>(thresholds);
  const [saved, setSaved] = useState<boolean>(false);

  const dirty =
    draft.humidityHigh !== thresholds.humidityHigh ||
    draft.humidityLow !== thresholds.humidityLow ||
    draft.gasDanger !== thresholds.gasDanger ||
    draft.tempHigh !== thresholds.tempHigh;

  const update = (patch: Partial<Thresholds>): void => {
    setSaved(false);
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = (): void => {
    const next: Thresholds = {
      ...draft,
      humidityHighOff: Math.max(0, draft.humidityHigh - 5),
      humidityLowOff: Math.min(95, draft.humidityLow + 5),
      gasDangerOff: Math.max(0, draft.gasDanger - 30),
    };
    setThresholds(next);
    setSaved(true);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <TechLabel>Configuration</TechLabel>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>
          Tune thresholds, inspect the hardware bill of materials, and review the broker the
          mobile app talks to.
        </Text>
      </View>

      <SectionHeader
        title="Thresholds"
        description="Hysteresis-paired setpoints. The fan, humidifier and alarm follow these on every tick."
      />

      <View style={styles.sliderStack}>
        <ThresholdSlider
          label="Humidity · high (fan on)"
          description="Fan engages above this RH; clears 5 % below."
          value={draft.humidityHigh}
          min={45}
          max={85}
          unit="%"
          onChange={(v) => update({ humidityHigh: v })}
        />
        <ThresholdSlider
          label="Humidity · low (humidifier on)"
          description="Humidifier engages below this RH; clears 5 % above."
          value={draft.humidityLow}
          min={20}
          max={50}
          unit="%"
          onChange={(v) => update({ humidityLow: v })}
        />
        <ThresholdSlider
          label="Gas danger"
          description="Piezo alarm latches above this ppm; clears 30 ppm below."
          value={draft.gasDanger}
          min={150}
          max={800}
          step={10}
          unit="ppm"
          onChange={(v) => update({ gasDanger: v })}
        />
        <ThresholdSlider
          label="Temperature ceiling"
          description="Logged as a warning when room temperature exceeds this value."
          value={draft.tempHigh}
          min={20}
          max={40}
          unit="°C"
          onChange={(v) => update({ tempHigh: v })}
        />
      </View>

      <View style={styles.actionRow}>
        <Pill label={saved && !dirty ? 'Saved' : 'Save thresholds'} onPress={handleSave} disabled={!dirty} />
        <Pill
          label="Reset"
          variant="ghost"
          onPress={() => {
            setDraft(thresholds);
            setSaved(false);
          }}
          disabled={!dirty}
        />
      </View>

      <SectionHeader title="About Room Manager" description="Hardware and connectivity reference" />

      <View style={styles.bomCard}>
        <TechLabel>Bill of materials</TechLabel>
        <View style={styles.chipRow}>
          {HARDWARE_BOM.map((item) => (
            <View key={item.label} style={styles.chip}>
              <Text style={styles.chipLabel}>{item.label}</Text>
              <Text style={styles.chipSpec}>{item.spec}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.brokerCard}>
        <TechLabel>MQTT broker</TechLabel>
        <View style={styles.brokerRow}>
          <Icon name="wifi" size={16} color={colors.brandGreen} />
          <Text style={styles.brokerHost}>tcp://broker.roommanager.local:1883</Text>
        </View>
        <Text style={styles.brokerNote}>
          Read-only mock — replace the value in <Text style={styles.code}>src/lib/mockTelemetry.ts</Text> when you
          point the app at a real broker.
        </Text>
      </View>

      <View style={styles.firmwareCard}>
        <View style={styles.firmwareRow}>
          <View>
            <TechLabel>Firmware channel</TechLabel>
            <Text style={styles.firmwareValue}>stable · 1.4.2</Text>
          </View>
          <View>
            <TechLabel>Mobile build</TechLabel>
            <Text style={styles.firmwareValue}>0.1.0 · expo 51</Text>
          </View>
        </View>
      </View>
    </Screen>
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
  sliderStack: {
    gap: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  bomCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.xl,
    gap: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  chipLabel: {
    ...typography.bodySm,
    fontFamily: 'Inter_500Medium',
    color: colors.textPrimary,
  },
  chipSpec: {
    ...typography.caption,
    color: colors.textMuted,
  },
  brokerCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  brokerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  brokerHost: {
    ...typography.mono,
    color: colors.textPrimary,
  },
  brokerNote: {
    ...typography.bodySm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  code: {
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.textSecondary,
  },
  firmwareCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.xl,
  },
  firmwareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  firmwareValue: {
    ...typography.body,
    color: colors.textPrimary,
    marginTop: 2,
  },
});
