import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors, radii, spacing, typography } from '../theme';
import { TechLabel } from './TechLabel';

export interface ThresholdSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  description?: string;
  onChange: (value: number) => void;
}

/**
 * Wraps the platform Slider with mono numeric labels and the dark
 * surface treatment used on the settings screen. Keeps the brand green
 * for the active track only.
 */
export const ThresholdSlider: React.FC<ThresholdSliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  description,
  onChange,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <View style={styles.labelBlock}>
          <TechLabel>{label}</TechLabel>
          {description && <Text style={styles.description}>{description}</Text>}
        </View>
        <Text style={styles.value}>
          {Math.round(value)}
          {unit ? ` ${unit}` : ''}
        </Text>
      </View>
      <Slider
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={step}
        onValueChange={onChange}
        minimumTrackTintColor={colors.brandGreen}
        maximumTrackTintColor={colors.borderProminent}
        thumbTintColor={colors.brandGreen}
        style={styles.slider}
      />
      <View style={styles.boundsRow}>
        <Text style={styles.boundText}>
          {min}
          {unit ? ` ${unit}` : ''}
        </Text>
        <Text style={styles.boundText}>
          {max}
          {unit ? ` ${unit}` : ''}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  labelBlock: {
    flex: 1,
    paddingRight: spacing.md,
  },
  description: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  value: {
    ...typography.mono,
    color: colors.textPrimary,
  },
  slider: {
    marginTop: spacing.sm,
  },
  boundsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  boundText: {
    ...typography.mono,
    fontSize: 11,
    color: colors.textMuted,
  },
});
