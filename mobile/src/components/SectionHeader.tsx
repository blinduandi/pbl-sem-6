import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  rightSlot?: React.ReactNode;
}

/**
 * Heading row with a small subtitle and optional right-aligned slot
 * (used for "View all" links or counters). Never grows two-line — keep
 * the description concise.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, description, rightSlot }) => {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      {rightSlot && <View style={styles.right}>{rightSlot}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  left: {
    flex: 1,
    paddingRight: spacing.md,
  },
  right: {
    marginLeft: spacing.md,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  description: {
    ...typography.bodySm,
    color: colors.textMuted,
    marginTop: 2,
  },
});
