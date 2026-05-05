import React from 'react';
import { StyleSheet, Text, TextStyle, StyleProp } from 'react-native';
import { colors, typography } from '../theme';

export interface TechLabelProps {
  children: React.ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Mono uppercase eyebrow label. Pairs with hero/heading text and stat
 * blocks; never used as body copy.
 */
export const TechLabel: React.FC<TechLabelProps> = ({
  children,
  color = colors.textMuted,
  style,
}) => {
  return <Text style={[styles.label, { color }, style]}>{children}</Text>;
};

const styles = StyleSheet.create({
  label: {
    ...typography.techLabel,
  },
});
