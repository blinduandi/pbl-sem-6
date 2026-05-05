import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle, StyleProp, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

export interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
  refreshing?: boolean;
  onRefresh?: () => void;
}

/**
 * Standard page chrome — safe-area inset, dark page background, and
 * scrollable content with consistent horizontal padding. All screens
 * mount through this so spacing stays consistent across the app.
 */
export const Screen: React.FC<ScreenProps> = ({
  children,
  scrollable = true,
  contentStyle,
  edges = ['top'],
  refreshing,
  onRefresh,
}) => {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scrollable ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, contentStyle]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={colors.brandGreen}
                colors={[colors.brandGreen]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
});
