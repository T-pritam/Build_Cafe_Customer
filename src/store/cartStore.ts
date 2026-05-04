import {create} from 'zustand';

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
  fromDisplayName?: string;   // set when item came from an accepted push
  pushRequestId?: string;
  originalSessionId?: string;
}

export interface PendingScan {
  tableId: string;
  tableNumber: string;
}

interface CartState {
  items: CartItem[];
  tableNumber: string;
  tableId: string | null;
  sessionId: string | null;
  sessionStartedAt: number | null;
  sessionExpired: boolean;
  displayName: string | null;
  rewardPointsApplied: number;
  pendingScan: PendingScan | null;
  cubeId: string | null;
  cubeSessionId: string | null;
  cubeNumber: string;
  pendingCubeScan: string | null;
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
  setSessionExpired: (expired: boolean) => void;
  setPendingScan: (scan: PendingScan | null) => void;
  setPendingCubeScan: (token: string | null) => void;
}

function makeCartKey(id: string, modifiers: CartModifier[]): string {
  const modPart = modifiers
    .map(m => m.id)
    .sort()
    .join(',');
  return modPart ? `${id}_${modPart}` : id;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  tableNumber: '--',
  tableId: null,
  sessionId: null,
  sessionStartedAt: null,
  sessionExpired: false,
  displayName: null,
  rewardPointsApplied: 0,
  pendingScan: null,
  cubeId: null,
  cubeSessionId: null,
  cubeNumber: '--',
  pendingCubeScan: null,

  addItem: item => {
    const cartKey = makeCartKey(item.id, item.modifiers);
    set(state => {
      const existing = state.items.find(i => i.cartKey === cartKey);
      if (existing) {
        return {
          items: state.items.map(i =>
            i.cartKey === cartKey ? {...i, quantity: i.quantity + 1} : i,
          ),
        };
      }
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
          : state.items.map(i => (i.cartKey === cartKey ? {...i, quantity} : i)),
    })),

  clearCart: () => set({items: [], rewardPointsApplied: 0}),

  setSession: (tableId, tableNumber, sessionId, displayName) =>
    set({
      tableId,
      tableNumber: String(tableNumber).padStart(2, '0'),
      sessionId,
      displayName,
      sessionStartedAt: Date.now(),
      sessionExpired: false,
    }),

  setCubeSession: (cubeId, cubeSessionId, cubeNumber) =>
    set({
      cubeId,
      cubeSessionId,
      cubeNumber: String(cubeNumber).padStart(2, '0'),
      sessionId: cubeSessionId,
      sessionStartedAt: Date.now(),
      sessionExpired: false,
    }),

  setRewardPointsApplied: points => set({rewardPointsApplied: points}),

  // Clears session metadata only — cart items are preserved (browse-only mode)
  clearSessionOnly: () =>
    set({
      tableId: null,
      tableNumber: '--',
      sessionId: null,
      sessionStartedAt: null,
      sessionExpired: false,
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
      sessionExpired: false,
      displayName: null,
      cubeId: null,
      cubeSessionId: null,
      cubeNumber: '--',
      items: [],
      rewardPointsApplied: 0,
    }),

  setSessionExpired: (expired) => set({sessionExpired: expired}),

  setPendingScan: scan => set({pendingScan: scan}),

  setPendingCubeScan: token => set({pendingCubeScan: token}),

  totalAmount: () =>
    get().items.reduce(
      (s, i) =>
        s +
        (i.price + i.modifiers.reduce((ms, m) => ms + m.price, 0)) * i.quantity,
      0,
    ),
  totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),
}));
