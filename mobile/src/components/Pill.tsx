import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

export type PillVariant = 'primary' | 'secondary' | 'ghost';

export interface PillProps {
  label: string;
  onPress?: () => void;
  variant?: PillVariant;
  disabled?: boolean;
  leadingIcon?: React.ReactNode;
}

/**
 * Pill-shaped pressable. Primary uses brand green; secondary uses the
 * neutral button surface. Never carries a shadow.
 */
export const Pill: React.FC<PillProps> = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  leadingIcon,
}) => {
  const styleSet = variantStyles[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styleSet.container,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {leadingIcon && <View style={styles.icon}>{leadingIcon}</View>}
      <Text style={[styles.label, styleSet.label]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.45,
  },
  icon: {
    marginRight: spacing.sm,
  },
  label: {
    ...typography.button,
  },
});

const variantStyles: Record<PillVariant, { container: object; label: object }> = {
  primary: {
    container: {
      backgroundColor: colors.brandGreen,
      borderColor: colors.brandGreen,
    },
    label: {
      color: colors.bgPage,
    },
  },
  secondary: {
    container: {
      backgroundColor: colors.bgButton,
      borderColor: colors.borderProminent,
    },
    label: {
      color: colors.textPrimary,
    },
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
      borderColor: colors.borderDefault,
    },
    label: {
      color: colors.textSecondary,
    },
  },
};
