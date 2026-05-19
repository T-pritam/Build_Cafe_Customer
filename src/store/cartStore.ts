import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartModifier {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  cartKey: string;      // dedup key: `${menuItemId}_${sortedModifierIds}`
  id: string;           // menuItemId
  name: string;
  price: number;        // base price per unit (excludes modifiers)
  quantity: number;
  image?: string;
  isVeg: boolean;
  modifiers: CartModifier[];
  maxOrderQty?: number;       // server-computed cap: min(10, floor(stock / recipeQty))
  fromDisplayName?: string;   // set when item came from an accepted push
  pushRequestId?: string;
  originalSessionId?: string;
}

export interface PendingScan {
  tableId: string;
  tableNumber: string;
}

export interface OutgoingPush {
  pushId:        string;
  toDisplayName: string;
  items:         CartItem[];  // snapshot of items removed from cart; restored on reject/expire/cancel
}

interface CartState {
  items: CartItem[];
  tableNumber: string;
  tableId: string | null;
  sessionId: string | null;
  sessionStartedAt: number | null;
  displayName: string | null;
  rewardPointsApplied: number;
  pendingScan: PendingScan | null;
  cubeId: string | null;
  cubeSessionId: string | null;
  cubeNumber: string;
  pendingCubeScan: string | null;
  outgoingPushes: OutgoingPush[];
  addItem: (item: Omit<CartItem, 'quantity' | 'cartKey'>) => void;
  removeItem: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  clearCart: () => void;
  totalAmount: () => number;
  totalItems: () => number;
  setSession: (tableId: string, tableNumber: number, sessionId: string, displayName: string) => void;
  setCubeSession: (cubeId: string, cubeSessionId: string, cubeNumber: number) => void;
  setRewardPointsApplied: (points: number) => void;
  clearSessionOnly: () => void;
  clearSession: () => void;
  clearAll: () => void;
  resetSessionTimer: () => void;
  setPendingScan: (scan: PendingScan | null) => void;
  setPendingCubeScan: (token: string | null) => void;
  addOutgoingPush: (push: OutgoingPush) => void;
  removeOutgoingPush: (pushId: string) => void;
  restoreOutgoingPush: (pushId: string) => void;
}

function makeCartKey(id: string, modifiers: CartModifier[]): string {
  const modPart = modifiers
    .map(m => m.id)
    .sort()
    .join(',');
  return modPart ? `${id}_${modPart}` : id;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
  items: [],
  tableNumber: '--',
  tableId: null,
  sessionId: null,
  sessionStartedAt: null,
  displayName: null,
  rewardPointsApplied: 0,
  pendingScan: null,
  cubeId: null,
  cubeSessionId: null,
  cubeNumber: '--',
  pendingCubeScan: null,
  outgoingPushes: [],

  addItem: item => {
    const cartKey = makeCartKey(item.id, item.modifiers);
    const max = item.maxOrderQty ?? 10;
    set(state => {
      const existing = state.items.find(i => i.cartKey === cartKey);
      if (existing) {
        if (existing.quantity >= max) return state;
        return {
          items: state.items.map(i =>
            i.cartKey === cartKey ? {...i, quantity: i.quantity + 1} : i,
          ),
        };
      }
      if (max < 1) return state;
      return {items: [...state.items, {...item, cartKey, quantity: 1}]};
    });
  },

  removeItem: cartKey =>
    set(state => ({items: state.items.filter(i => i.cartKey !== cartKey)})),

  updateQuantity: (cartKey, quantity) =>
    set(state => ({
      items:
        quantity === 0
          ? state.items.filter(i => i.cartKey !== cartKey)
          : state.items.map(i => {
              if (i.cartKey !== cartKey) return i;
              const cap = i.maxOrderQty ?? 10;
              return {...i, quantity: Math.min(quantity, cap)};
            }),
    })),

  clearCart: () => set({items: [], rewardPointsApplied: 0}),

  setSession: (tableId, tableNumber, sessionId, displayName) =>
    set({
      tableId,
      tableNumber: String(tableNumber).padStart(2, '0'),
      sessionId,
      displayName,
      sessionStartedAt: Date.now(),
    }),

  setCubeSession: (cubeId, cubeSessionId, cubeNumber) =>
    set({
      cubeId,
      cubeSessionId,
      cubeNumber: String(cubeNumber).padStart(2, '0'),
      sessionId: cubeSessionId,
      sessionStartedAt: Date.now(),
    }),

  setRewardPointsApplied: points => set({rewardPointsApplied: points}),

  // Clears session metadata only — cart items are preserved (browse-only mode)
  clearSessionOnly: () =>
    set({
      tableId: null,
      tableNumber: '--',
      sessionId: null,
      sessionStartedAt: null,
      displayName: null,
      cubeId: null,
      cubeSessionId: null,
      cubeNumber: '--',
    }),

  // Clears session AND cart — called after successful order placement
  clearSession: () =>
    set({
      tableId: null,
      tableNumber: '--',
      sessionId: null,
      sessionStartedAt: null,
      displayName: null,
      cubeId: null,
      cubeSessionId: null,
      cubeNumber: '--',
      items: [],
      rewardPointsApplied: 0,
    }),

  // Nuke the entire cart store — used on logout so re-login starts clean.
  clearAll: () =>
    set({
      items:                [],
      tableId:              null,
      tableNumber:          '--',
      sessionId:            null,
      sessionStartedAt:     null,
      displayName:          null,
      rewardPointsApplied:  0,
      pendingScan:          null,
      cubeId:               null,
      cubeSessionId:        null,
      cubeNumber:           '--',
      pendingCubeScan:      null,
      outgoingPushes:       [],
    }),

  // Resets the countdown without touching anything else — used by the Extend button
  resetSessionTimer: () => set({sessionStartedAt: Date.now()}),

  setPendingScan: scan => set({pendingScan: scan}),

  setPendingCubeScan: token => set({pendingCubeScan: token}),

  addOutgoingPush: push =>
    set(state => ({outgoingPushes: [...state.outgoingPushes, push]})),

  removeOutgoingPush: pushId =>
    set(state => ({outgoingPushes: state.outgoingPushes.filter(p => p.pushId !== pushId)})),

  restoreOutgoingPush: pushId =>
    set(state => {
      const outgoing = state.outgoingPushes.find(p => p.pushId === pushId);
      if (!outgoing) return {};
      // Merge restored items back, incrementing quantity if cartKey already exists
      let items = [...state.items];
      for (const item of outgoing.items) {
        const existing = items.find(i => i.cartKey === item.cartKey);
        if (existing) {
          items = items.map(i =>
            i.cartKey === item.cartKey ? {...i, quantity: i.quantity + item.quantity} : i,
          );
        } else {
          items = [...items, item];
        }
      }
      return {
        items,
        outgoingPushes: state.outgoingPushes.filter(p => p.pushId !== pushId),
      };
    }),

  totalAmount: () =>
    get().items.reduce(
      (s, i) =>
        s +
        (i.price + i.modifiers.reduce((ms, m) => ms + m.price, 0)) * i.quantity,
      0,
    ),
  totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    {
      name: 'cart-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        items:               state.items,
        tableNumber:         state.tableNumber,
        tableId:             state.tableId,
        sessionId:           state.sessionId,
        sessionStartedAt:    state.sessionStartedAt,
        displayName:         state.displayName,
        rewardPointsApplied: state.rewardPointsApplied,
        cubeId:              state.cubeId,
        cubeSessionId:       state.cubeSessionId,
        cubeNumber:          state.cubeNumber,
        outgoingPushes:      state.outgoingPushes,
      }),
    },
  ),
);
