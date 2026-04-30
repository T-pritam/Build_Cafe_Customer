import {create} from 'zustand';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  isVeg: boolean;
}

interface CartState {
  items: CartItem[];
  tableNumber: string;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalAmount: () => number;
  totalItems: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  tableNumber: '07',
  addItem: item =>
    set(state => {
      const existing = state.items.find(i => i.id === item.id);
      if (existing) {
        return {
          items: state.items.map(i =>
            i.id === item.id ? {...i, quantity: i.quantity + 1} : i,
          ),
        };
      }
      return {items: [...state.items, {...item, quantity: 1}]};
    }),
  removeItem: id =>
    set(state => ({items: state.items.filter(i => i.id !== id)})),
  updateQuantity: (id, quantity) =>
    set(state => ({
      items:
        quantity === 0
          ? state.items.filter(i => i.id !== id)
          : state.items.map(i => (i.id === id ? {...i, quantity} : i)),
    })),
  clearCart: () => set({items: []}),
  totalAmount: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
  totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),
}));
