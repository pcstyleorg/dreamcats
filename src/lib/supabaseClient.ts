import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function initializeSupabaseClient(): SupabaseClient {
  try {
    if (!supabaseUrl || !supabaseUrl.startsWith('http') || !supabaseAnonKey) {
      throw new Error('Supabase URL or Anon Key is missing or invalid.');
    }
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.warn(
      `Supabase initialization failed. Multiplayer will not work. Using a mock client. Error: ${(error as Error).message}`
    );
    // Return a placeholder client that won't crash the app
    return createClient('http://localhost:54321', 'placeholderkey', {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
}

export const supabase = initializeSupabaseClient();
