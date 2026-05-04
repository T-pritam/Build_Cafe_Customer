import {createClient, SupabaseClient} from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

const supabaseUrl = Config.SUPABASE_URL;
const supabaseAnonKey = Config.SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        realtime: {
          params: {eventsPerSecond: 10},
        },
      })
    : null;

export const Channels = {
  orderSession: (sessionId: string) => `orders:session:${sessionId}`,
  menuAvail:    () => 'menu:availability',
  push:         (sessionId: string) => `push:${sessionId}`,
  cubeSession:  (sessionId: string) => `cube:session:${sessionId}`,
};
