import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Shape mirrors the /orders/active backend response so we can adopt the
 * server's payload directly without normalisation.
 */
export interface ActiveOrder {
  id: string;
  status: string;
  orderSource: 'CAFE_APP' | 'GYM_APP';
  orderType: string;
  totalAmount: string;
  createdAt: string;
  sessionId: string | null;
  tableNumber: number | null;
  cubeNumber: number | null;
  deliveryPin: string | null;
  shortRef: string;
}

interface ActiveOrderState {
  activeOrder: ActiveOrder | null;
  // Cafe-side customerId, returned alongside `/orders/active`. Cached so the
  // ActiveOrderBar can subscribe to its per-customer discovery channel even
  // before an order exists.
  customerId: string | null;
  setActiveOrder:    (order: ActiveOrder | null) => void;
  updateOrderStatus: (status: string) => void;
  clearActiveOrder:  () => void;
  setCustomerId:     (id: string | null) => void;
}

export const useActiveOrderStore = create<ActiveOrderState>()(
  persist(
    (set) => ({
      activeOrder: null,
      customerId: null,
      setActiveOrder:   (order)  => set({activeOrder: order}),
      clearActiveOrder: ()       => set({activeOrder: null}),
      setCustomerId:    (id)     => set({customerId: id ?? null}),
      updateOrderStatus: (status) =>
        set((s) => s.activeOrder
          ? {activeOrder: {...s.activeOrder, status}}
          : s,
        ),
    }),
    {
      name: 'bcc-active-order-v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
