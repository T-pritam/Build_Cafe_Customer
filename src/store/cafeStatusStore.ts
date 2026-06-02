import {create} from 'zustand';
import {supabase, Channels} from '../services/supabase';
import {BASE_URL} from '../services/api';

interface CafeStatusState {
  isOpen: boolean;
  loaded: boolean;
  fetchStatus: () => Promise<void>;
  subscribeRealtime: () => () => void;
}

export const useCafeStatusStore = create<CafeStatusState>((set) => ({
  isOpen: true,
  loaded: false,

  fetchStatus: async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/cafe/status`);
      const data = await res.json();
      if (typeof data?.isOpen === 'boolean') {
        set({isOpen: data.isOpen, loaded: true});
      }
    } catch {
      set({loaded: true});
    }
  },

  subscribeRealtime: () => {
    if (!supabase) return () => {};
    const ch = supabase
      .channel(Channels.cafeStatus())
      .on('broadcast', {event: 'CAFE_STATUS_CHANGED'}, (payload: any) => {
        if (typeof payload?.payload?.isOpen === 'boolean') {
          set({isOpen: payload.payload.isOpen});
        }
      })
      .subscribe();
    return () => { supabase?.removeChannel(ch); };
  },
}));
