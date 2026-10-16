import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, processLock } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

// Reuse one client rather than creating one for every button press.
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  // Read the team's variable names from .env.
  // Do not paste your actual keys into this code.
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  // The form will display this message if configuration is missing.
  if (!url || !anonKey) {
    throw new Error(
      'Add your Supabase URL and ANON_KEY to .env, then restart Expo.'
    );
  }

  client = createClient(url, anonKey, {
    auth: {
      // Phones store the session using AsyncStorage.
      // Web uses Supabase's default browser storage.
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),

      // Remember the login and refresh its access token.
      persistSession: true,
      autoRefreshToken: true,

      // For now, confirm email in the browser, then log in manually.
      detectSessionInUrl: false,

      // Coordinate simultaneous session operations on phones.
      ...(Platform.OS !== 'web' ? { lock: processLock } : {}),
    },
  });

  return client;
}