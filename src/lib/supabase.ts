import { createClient } from '@supabase/supabase-js';
import 'expo-sqlite/localStorage/install';
import 'react-native-url-polyfill/auto';

//read values from project's .env file
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

//check configuration before creating client
if(!supabaseUrl || !supabaseKey)
{
    throw new Error(
        'Supabase configuration is missing. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY'
    );
}

//create one subabase client for app to reuse
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth:
    {
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});