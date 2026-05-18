import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCartStore} from './cartStore';
import {sessionsAPI} from '../services/api';

export type UserRole = 'CUSTOMER' | 'CAPTAIN' | 'CHEF' | 'ADMIN';

export interface AuthUser {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  role: UserRole;
  onboardingCompleted: boolean;
  rewardPointsBalance: number;
  avatarUrl?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  deviceId: string | null;
  fcmToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setDeviceId: (deviceId: string) => void;
  setFcmToken: (token: string | null) => void;
  setRewardBalance: (balance: number) => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  hydrate: () => Promise<void>;
}

const STORAGE_KEY = 'buildcafe_auth';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  deviceId: null,
  fcmToken: null,
  isAuthenticated: false,
  isHydrated: false,

  setAuth: (user, accessToken, refreshToken) => {
    set({user, accessToken, refreshToken, isAuthenticated: true});
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({user, accessToken, refreshToken}),
    ).catch(() => {});
  },

  setDeviceId: deviceId => {
    set({deviceId});
  },

  setFcmToken: token => {
    set({fcmToken: token});
  },

  setRewardBalance: balance => {
    const user = get().user;
    if (user) {set({user: {...user, rewardPointsBalance: balance}});}
  },

  updateTokens: (accessToken, refreshToken) => {
    const {user} = get();
    set({accessToken, refreshToken});
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({user, accessToken, refreshToken}),
    ).catch(() => {});
  },

  logout: () => {
    // Terminate any active backend session BEFORE clearing local state so the
    // table window doesn't keep a ghost session around (which is what caused
    // re-login + re-scan to produce duplicate "Name (2)" display names).
    const sessionId = useCartStore.getState().sessionId;
    if (sessionId) {
      sessionsAPI.terminate(sessionId).catch(() => {});
    }
    set({user: null, accessToken: null, refreshToken: null, isAuthenticated: false});
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    useCartStore.getState().clearAll();
  },

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const {user, accessToken, refreshToken} = JSON.parse(raw);
        if (user && accessToken) {
          set({user, accessToken, refreshToken, isAuthenticated: true});
        }
      }
    } catch {
      // ignore corrupted storage
    } finally {
      set({isHydrated: true});
    }
  },
}));
