import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/tokens';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 60 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgLayer1,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: insets.bottom + 4,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.surface,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="picks"
        options={{
          title: 'Lucky AI',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="auto-awesome" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="qr-code-scanner" color={color} size={28} />
          ),
          tabBarItemStyle: {
            backgroundColor: colors.accent,
            borderRadius: 999,
            marginBottom: 4,
            marginHorizontal: 8,
          },
          tabBarActiveTintColor: colors.textDark,
          tabBarInactiveTintColor: colors.textDark,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Results',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="emoji-events" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="bar-chart" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
