import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />

      <Stack>
        <Stack.Screen
          name="index"
          options={{ headerShown: false}}
         />

         <Stack.Screen
          name="profile-intake"
          options={{
            title: 'Your Profile',
            headerBackTitle: 'Home',
          }}
        />
        
        <Stack.Screen
          name="explore"
          options={{ title: 'Explore' }}
        />
      </Stack>
    </ThemeProvider>
  );
}
