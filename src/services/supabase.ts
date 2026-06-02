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

// Realtime Authorization is enabled on the cafe project; private channels need
// a JWT on the websocket. The anon key is itself a valid anon-role JWT and
// matches the RLS policy on realtime.messages (see backend SQL).
if (supabase && supabaseAnonKey) {
  supabase.realtime.setAuth(supabaseAnonKey);
}

export const Channels = {
  orderSession:  (sessionId: string)    => `orders:session:${sessionId}`,
  orderById:     (orderId: string)      => `orders:order:${orderId}`,
  orderCustomer: (customerId: string)   => `orders:customer:${customerId}`,
  menuAvail:     () => 'menu:availability',
  push:          (sessionId: string)    => `push:${sessionId}`,
  cubeSession:   (sessionId: string)    => `cube:session:${sessionId}`,
  cafeStatus:    () => 'cafe:status',
};
