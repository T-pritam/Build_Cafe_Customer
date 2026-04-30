import {create} from 'zustand';

interface User {
  id: string;
  name: string;
  mobile: string;
  profilePic?: string;
  fcmToken?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User) => void;
  setFcmToken: (token: string) => void;
  setProfilePic: (uri: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  setUser: user => set({user, isAuthenticated: true}),
  setFcmToken: token =>
    set(state => ({
      user: state.user ? {...state.user, fcmToken: token} : null,
    })),
  setProfilePic: uri =>
    set(state => ({
      user: state.user ? {...state.user, profilePic: uri} : null,
    })),
  logout: () => set({user: null, isAuthenticated: false}),
}));
