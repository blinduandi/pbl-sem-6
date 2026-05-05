import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
} from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { Pressable } from 'react-native';

import { colors, radii, spacing } from './src/theme';
import { Icon, IconName } from './src/components/Icon';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { AlertsScreen } from './src/screens/AlertsScreen';
import { DevicesScreen } from './src/screens/DevicesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { DeviceDetailScreen } from './src/screens/DeviceDetailScreen';
import {
  connect as connectLiveBridge,
  disconnect as disconnectLiveBridge,
} from './src/lib/liveBridge';

export type TabParamList = {
  Dashboard: undefined;
  Alerts: undefined;
  Devices: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  DeviceDetail: { deviceId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bgPage,
    card: colors.bgPage,
    text: colors.textPrimary,
    border: colors.borderDefault,
    primary: colors.brandGreen,
    notification: colors.danger,
  },
};

const TAB_ICONS: Record<keyof TabParamList, IconName> = {
  Dashboard: 'home',
  Alerts: 'bell',
  Devices: 'grid',
  Settings: 'settings',
};

const TabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  return (
    <View style={tabStyles.container}>
      <View style={tabStyles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const accessibilityLabel =
            typeof options.tabBarAccessibilityLabel === 'string'
              ? options.tabBarAccessibilityLabel
              : route.name;
          const icon = TAB_ICONS[route.name as keyof TabParamList];

          const onPress = (): void => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[tabStyles.item, focused && tabStyles.itemActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={accessibilityLabel}
            >
              <Icon
                name={icon}
                size={22}
                color={focused ? colors.brandGreen : colors.textMuted}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const TabsNavigator: React.FC = () => (
  <Tabs.Navigator
    tabBar={(props) => <TabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tabs.Screen name="Dashboard" component={DashboardScreen} />
    <Tabs.Screen name="Alerts" component={AlertsScreen} />
    <Tabs.Screen name="Devices" component={DevicesScreen} />
    <Tabs.Screen name="Settings" component={SettingsScreen} />
  </Tabs.Navigator>
);

const App: React.FC = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontError, setFontError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    Font.loadAsync({
      Inter_400Regular,
      Inter_500Medium,
      JetBrainsMono_400Regular,
    })
      .then(() => {
        if (!cancelled) setFontsLoaded(true);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          // Even if Inter / JetBrains Mono fail to load, we keep going so the
          // app still renders with a system fallback rather than blocking.
          // eslint-disable-next-line no-console
          console.warn('Font load failed', err);
          setFontError(err);
          setFontsLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;
    connectLiveBridge();
    return () => {
      disconnectLiveBridge();
    };
  }, [fontsLoaded]);

  const renderStack = useCallback(
    () => (
      <Stack.Navigator
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgPage } }}
      >
        <Stack.Screen name="Tabs" component={TabsNavigator} />
        <Stack.Screen
          name="DeviceDetail"
          component={DeviceDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    ),
    [],
  );

  if (!fontsLoaded) {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" backgroundColor={colors.bgPage} />
        <Text style={styles.splashText}>Room Manager</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={colors.bgPage} />
        <NavigationContainer theme={navTheme}>{renderStack()}</NavigationContainer>
        {fontError && (
          <View style={styles.fontWarning} pointerEvents="none">
            <Text style={styles.fontWarningText}>System font fallback active</Text>
          </View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  splash: {
    flex: 1,
    backgroundColor: colors.bgPage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashText: {
    color: colors.brandGreen,
    fontSize: 18,
    letterSpacing: 1.4,
  },
  fontWarning: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 9999,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  fontWarningText: {
    color: colors.textMuted,
    fontSize: 11,
  },
});

const tabStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgPage,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bgSurface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.xs,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radii.pill,
  },
  itemActive: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.brandGreenBorder,
  },
});

export default App;
