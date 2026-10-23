import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />

      <Stack>
        {/* The five bottom tabs live in the (tabs) folder */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Screens that open on top of the tabs (with a back button) */}
        <Stack.Screen
          name="profile-intake"
          options={{
            title: 'Your Profile',
            headerBackTitle: 'Home',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
