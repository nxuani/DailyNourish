import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { DefaultTheme, Stack, ThemeProvider, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

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
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const segments = useSegments();
  const firstSegment = segments[0];

  useEffect(() => {
    let isMounted = true;

    //listen for login and logout events
    const { data: { subscription }, } = supabase.auth.onAuthStateChange((_event, session) => {
      if(isMounted)
      {
        setSession(session);
        setIsAuthLoading(false);
      }
    });

    //check whether user isalready signed in
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if(!isMounted)
      {
        return;
      }

      if(error)
      {
        console.log('Session check error:', error.message);
      }

      setSession(session);
      setIsAuthLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const isInAuthenticatedRoute =
      firstSegment === '(tabs)' ||
      firstSegment === 'profile-intake' ||
      firstSegment === 'FoodSearch';
    
    if(!isAuthLoading && session === null && isInAuthenticatedRoute)
    {
      console.log('User is signed out. Redirecting to welcome screen');
      router.replace('/');
    }
  }, [isAuthLoading, session, firstSegment]);

  const isSignedIn = isAuthLoading || session !== null;

  return (
    <ThemeProvider value={DailyNourishTheme}>
      <AnimatedSplashOverlay />

      <Stack>
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

        <Stack.Screen
          name="FoodSearch"
          options={{ headerShown: false }}
        />
      </Stack>
    </ThemeProvider>
  );
}
