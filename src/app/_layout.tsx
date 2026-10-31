import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { colors } from '@/constants/colors';

SplashScreen.preventAutoHideAsync();

const DailyNourishTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.card,
    text: colors.ink,
    border: colors.border,
    notification: colors.primary,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={DailyNourishTheme}>
      <AnimatedSplashOverlay />

      <Stack initialRouteName="index">
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="profile-intake"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
