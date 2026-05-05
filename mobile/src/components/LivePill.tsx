import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

/**
 * Small green pill rendered next to a device's name when it's currently
 * fed by the live WebSocket bridge (rather than the in-app simulator).
 */
export const LivePill: React.FC = () => (
  <View style={styles.pill}>
    <View style={styles.dot} />
    <Text style={styles.text}>Live</Text>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.brandGreenBorder,
    backgroundColor: colors.brandGreenGlow,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.brandGreen,
    marginRight: spacing.xs + 2,
  },
  text: {
    ...typography.techLabel,
    color: colors.brandGreen,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    letterSpacing: 1.2,
  },
});
