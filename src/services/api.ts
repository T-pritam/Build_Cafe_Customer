import axios from 'axios';
import Config from 'react-native-config';
import {useAuthStore} from '../store/authStore';

export const BASE_URL = Config.API_BASE_URL || 'http://10.0.2.2:3003';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {'Content-Type': 'application/json'},
});

// Attach JWT to every request
api.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err?.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().logout();
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Something went wrong';
        return Promise.reject(new Error(msg));
      }
      if (isRefreshing) {
        return new Promise(resolve => {
          refreshQueue.push(token => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }
      isRefreshing = true;
      try {
        const res = await axios.post(`${BASE_URL}/auth/refresh`, {refreshToken});
        const newToken = res.data.accessToken;
        useAuthStore.getState().updateTokens(newToken, res.data.refreshToken);
        refreshQueue.forEach(cb => cb(newToken));
        refreshQueue = [];
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    const msg =
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      'Something went wrong';
    return Promise.reject(new Error(msg));
  },
);

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authAPI = {
  sendOTP: (phone: string, deviceId?: string) =>
    api.post<{message: string; _devOtp?: string}>('/otp/send', {phone, app: 'customer', ...(deviceId ? {deviceId} : {})}),

  verifyOTP: (phone: string, otp: string, name?: string) =>
    api.post<{
      accessToken: string;
      refreshToken: string;
      user: {
        id: string;
        phone: string;
        name: string | null;
        email: string | null;
        role: string;
        onboardingCompleted: boolean;
        rewardPointsBalance: number;
      };
    }>('/otp/verify', {phone, otp, name}),

  refresh: (refreshToken: string) =>
    api.post<{accessToken: string; refreshToken: string}>('/auth/refresh', {refreshToken}),

  me: () =>
    api.get<{
      user: {id: string; name: string | null; phone: string; role: string; onboardingCompleted: boolean; rewardPointsBalance: number};
    }>('/auth/me'),
};

export const fcmTokensAPI = {
  register: (params: {
    token: string;
    deviceId: string;
    platform: 'ios' | 'android' | 'web';
    app: 'customer' | 'admin';
    phone?: string;
    userId?: string;
  }) => api.post<{ok: boolean}>('/fcm-tokens', params),

  deactivate: (deviceId: string, app: 'customer' | 'admin') =>
    api.delete<{ok: boolean}>(`/fcm-tokens/${deviceId}`, {params: {app}}),
};

// ── Tables ───────────────────────────────────────────────────────────────────

export const tablesAPI = {
  scan: (tableId: string) =>
    api.post<{tableId: string; tableNumber: number}>('/tables/scan', {tableId}),

  available: () =>
    api.get<{tables: Array<{id: string; tableNumber: number; status: 'FREE' | 'OCCUPIED'}>}>(
      '/tables/available',
    ),
};

// ── Sessions ─────────────────────────────────────────────────────────────────

export const sessionsAPI = {
  create: (params: {
    tableId: string;
    displayName: string;
    deviceFingerprint: string;
  }) =>
    api.post<{id: string; tableNumber: number; displayName: string; resumed: boolean}>(
      '/sessions',
      params,
    ),

  terminate: (sessionId: string) =>
    api.post<{ok: boolean}>(`/sessions/${sessionId}/terminate`, {}),

  heartbeat: (sessionId: string) =>
    api.patch<{ok: boolean}>(`/sessions/${sessionId}/heartbeat`),

  tablePeers: (sessionId: string) =>
    api.get<{peers: Array<{id: string; displayName: string}>}>(
      `/sessions/${sessionId}/table-peers`,
    ),
};

// ── Menu ─────────────────────────────────────────────────────────────────────

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isVeg: boolean;
  isAvailable: boolean;
  sortOrder: number;
  modifiers: Array<{id: string; name: string; price: string; isAvailable: boolean}>;
}

export interface MenuCategory {
  id: string;
  name: string;
  imageUrl: string | null;
  sortOrder: number;
  items: MenuItem[];
}

export const menuAPI = {
  getMenu: () => api.get<{categories: MenuCategory[]}>('/menu'),
};

// ── Orders ────────────────────────────────────────────────────────────────────

export const ordersAPI = {
  create: (params: {
    sessionId: string;
    items: Array<{
      menuItemId: string;
      quantity: number;
      unitPrice: number;
      modifiers?: Array<{name: string; price: number}>;
    }>;
    rewardPointsToRedeem?: number;
    paymentMode: 'CASH' | 'UPI' | 'CARD' | 'REWARD_POINTS';
  }) =>
    api.post<{
      orderId: string;
      razorpayOrderId: string | null;
      amount: number;
      amountPaise: number;
      currency: string;
      keyId: string;
    }>('/orders', params),

  listByUser: () =>
    api.get<{
      orders: Array<{
        id: string;
        status: string;
        totalAmount: string;
        createdAt: string;
        sessionId: string | null;
        items: Array<{name: string; quantity: number; unitPrice: string}>;
      }>;
    }>('/orders/mine'),

  getOrder: (orderId: string) =>
    api.get<{
      id: string;
      status: string;
      totalAmount: string;
      gstAmount: string;
      createdAt: string;
      items: Array<{
        id: string;
        menuItemId: string;
        name: string;
        quantity: number;
        unitPrice: string;
      }>;
    }>(`/orders/${orderId}`),

  listBySession: (sessionId: string) =>
    api.get<{
      orders: Array<{
        id: string;
        status: string;
        totalAmount: string;
        createdAt: string;
        items: Array<{name: string; quantity: number; unitPrice: string}>;
      }>;
    }>('/orders', {params: {sessionId}}),
};

// ── Push Requests ─────────────────────────────────────────────────────────────

export interface PushCartItem {
  menuItemId:         string;
  name:               string;
  quantity:           number;
  unitPrice:          number;
  modifiers:          Array<{name: string; price: number}>;
  originalSessionId?: string;  // preserved through push chains (edge case 6)
  specialNote?:       string;
}

export interface IncomingPushRecord {
  id:              string;
  fromSessionId:   string;
  fromSession:     {displayName: string};
  cartSnapshot:    PushCartItem[];
  totalAmount:     string;
  status:          string;
  expiresAt:       string;
}

export const pushRequestsAPI = {
  create: (params: {
    fromSessionId: string;
    toSessionId:   string;
    items:         PushCartItem[];
  }) =>
    api.post<{pushId: string}>('/push-requests', params),

  accept: (id: string) =>
    api.post<{
      ok: boolean;
      alreadyAccepted?: boolean;
      allItemsUnavailable?: boolean;
      acceptedItems?: PushCartItem[];
      unavailableItems?: string[];
    }>(`/push-requests/${id}/accept`, {}),

  reject: (id: string) =>
    api.post<{ok: boolean}>(`/push-requests/${id}/reject`, {}),

  cancel: (id: string) =>
    api.post<{ok: boolean}>(`/push-requests/${id}/cancel`, {}),

  incoming: (sessionId: string) =>
    api.get<{pushRequests: IncomingPushRecord[]}>(
      '/push-requests/incoming',
      {params: {sessionId}},
    ),

  outgoing: (sessionId: string) =>
    api.get<{
      pushRequests: Array<{
        id:        string;
        toSession: {displayName: string};
        cartSnapshot: PushCartItem[];
        totalAmount:  string;
        expiresAt:    string;
      }>;
    }>('/push-requests/outgoing', {params: {sessionId}}),
};

// ── Rewards ───────────────────────────────────────────────────────────────────

export const rewardsAPI = {
  balance: () =>
    api.get<{rewardPointsBalance: number; customerId: string}>('/rewards/balance'),
};

// ── Feedback ─────────────────────────────────────────────────────────────────

export const feedbackAPI = {
  submit: (params: {
    orderId: string;
    items: Array<{
      menuItemId:  string;
      orderItemId?: string;
      rating:      number;
      comment?:    string;
    }>;
  }) => api.post<{ok: boolean}>('/feedback', params),
};

// ── Cubes ─────────────────────────────────────────────────────────────────────

export interface CubeOrderItem {
  id:         string;
  name:       string;
  quantity:   number;
  unitPrice:  string;
  menuItemId: string;
}

export interface CubeOrder {
  id:          string;
  status:      string;
  totalAmount: string;
  createdAt:   string;
  items:       CubeOrderItem[];
}

export const cubeAPI = {
  scan: (params: {
    qrCodeToken:       string;
    displayName:       string;
    deviceFingerprint: string;
  }) =>
    api.post<{
      sessionId:   string;
      cubeNumber:  number;
      cubeId:      string;
      resumed:     boolean;
      displayName: string;
    }>('/cubes/scan', params),

  bySession: (sessionId: string) =>
    api.get<{
      cube:   {id: string; cubeNumber: number; qrCodeToken: string; status: string};
      orders: CubeOrder[];
    }>(`/cubes/by-session/${sessionId}`),
};

export default api;
