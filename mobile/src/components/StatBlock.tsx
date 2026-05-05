import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import { TechLabel } from './TechLabel';

export interface StatBlockProps {
  label: string;
  value: string;
  unit?: string;
  trailing?: React.ReactNode;
  emphasised?: boolean;
}

/**
 * Big-number tile used in summary cards and detail panels. The unit is
 * baseline-aligned next to the number so the eye reads "47 %" cleanly.
 */
export const StatBlock: React.FC<StatBlockProps> = ({
  label,
  value,
  unit,
  trailing,
  emphasised = false,
}) => {
  return (
    <View style={[styles.container, emphasised && styles.emphasised]}>
      <TechLabel>{label}</TechLabel>
      <View style={styles.valueRow}>
        <Text
          style={[styles.value, emphasised && { color: colors.brandGreen }]}
          numberOfLines={1}
        >
          {value}
        </Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      {trailing && <View style={styles.trailing}>{trailing}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
  },
  emphasised: {
    borderColor: colors.brandGreenBorder,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: spacing.sm,
  },
  value: {
    ...typography.hero,
    color: colors.textPrimary,
    fontSize: 32,
    lineHeight: 34,
  },
  unit: {
    ...typography.bodySm,
    color: colors.textMuted,
    marginLeft: spacing.xs,
    marginBottom: 4,
  },
  trailing: {
    marginTop: spacing.md,
  },
});
