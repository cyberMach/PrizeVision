import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../src/theme/tokens';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor={colors.bgPrimary} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgPrimary } }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
