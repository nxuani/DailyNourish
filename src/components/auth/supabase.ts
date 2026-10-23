import { supabase } from '@/lib/supabase';

// Reuse the shared client added by the intake work.
// Both authentication and profile intake now see the same session.
export function getSupabase() {
  return supabase;
}