import React, {useEffect, useRef, useState, useMemo} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Colors, Radius, Shadow, Spacing} from '../theme';
import {useAuthStore} from '../store/authStore';
import {useActiveOrderStore} from '../store/activeOrderStore';
import {ordersAPI} from '../services/api';
import {supabase, Channels} from '../services/supabase';
import {navRef} from '../navigation/RootNavigator';
import Toast from 'react-native-toast-message';

// Statuses that surface the bar. PAYMENT_PENDING is intentionally excluded
// (the checkout flow handles retry). COMPLETED + CANCELLED hide the bar.
const ACTIVE_STATUSES = [
  'KOT_GENERATED', 'NEW', 'PREPARING', 'READY',
  'PICKUP_CLAIMED', 'OUT_FOR_DELIVERY', 'DELIVERED',
] as const;

const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED'] as const;

// User-facing labels — kept inline to match BuildGym's pattern.
const STATUS_LABELS: Record<string, string> = {
  KOT_GENERATED:    'Order confirmed',
  NEW:              'Order placed',
  PREPARING:        'Preparing your order',
  READY:            'Ready for pickup',
  PICKUP_CLAIMED:   'Out for pickup',
  OUT_FOR_DELIVERY: 'On the way',
  DELIVERED:        'Delivered',
};

// Routes that should render the bar. On any stack-modal route (OrderDetail,
// OrderTracking, SessionNamePrompt, QRScanner, etc.) we hide it.
const TAB_ROUTES = new Set(['Menu', 'Cart', 'Orders', 'Profile']);

function isActive(status: string | undefined | null): boolean {
  return !!status && (ACTIVE_STATUSES as readonly string[]).includes(status);
}
function isTerminal(status: string | undefined | null): boolean {
  return !!status && (TERMINAL_STATUSES as readonly string[]).includes(status);
}

export const ActiveOrderBar: React.FC = () => {
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);

  const activeOrder      = useActiveOrderStore(s => s.activeOrder);
  const customerId       = useActiveOrderStore(s => s.customerId);
  const setActiveOrder   = useActiveOrderStore(s => s.setActiveOrder);
  const updateOrderStatus = useActiveOrderStore(s => s.updateOrderStatus);
  const clearActiveOrder  = useActiveOrderStore(s => s.clearActiveOrder);
  const setCustomerId     = useActiveOrderStore(s => s.setCustomerId);

  // Track current route name. The bar lives at root level (above
  // NavigationContainer), so we listen on navRef instead of useNavigation.
  const [routeName, setRouteName] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!isAuthenticated) {
      setRouteName(undefined);
      return;
    }
    const sync = () => {
      if (navRef.isReady()) setRouteName(navRef.getCurrentRoute()?.name);
    };
    sync();
    const unsub = navRef.addListener('state', sync);
    return unsub;
  }, [isAuthenticated]);

  // ── Reconcile with server on mount + on auth change ─────────────────────
  // Adopts the server's view of the active order (covers cross-device
  // discovery and status drift while the app was closed).
  useEffect(() => {
    if (!isAuthenticated) {
      clearActiveOrder();
      setCustomerId(null);
      return;
    }
    let cancelled = false;
    const reconcile = async () => {
      try {
        const {data} = await ordersAPI.getActive();
        if (cancelled) return;
        if (data.customerId) setCustomerId(data.customerId);

        const server = data.order;
        const local  = useActiveOrderStore.getState().activeOrder;
        if (server) {
          if (!local || local.id !== server.id) {
            setActiveOrder(server);
          } else if (local.status !== server.status) {
            updateOrderStatus(server.status);
          }
        } else if (local) {
          // Server confirms no active order — clear stale local entry.
          clearActiveOrder();
        }
      } catch {
        // Offline — preserve local state.
      }
    };
    reconcile();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Per-order Realtime subscription ──────────────────────────────────────
  const orderId = activeOrder?.id;
  useEffect(() => {
    const supa = supabase;
    if (!supa || !orderId) return undefined;
    const channel = supa
      .channel(Channels.orderById(orderId), {config: {private: true}})
      .on('broadcast', {event: 'ORDER_STATUS'}, ({payload}: any) => {
        const status: string | undefined = payload?.status;
        if (!status) return;
        if (isTerminal(status)) {
          clearActiveOrder();
        } else {
          updateOrderStatus(status);
        }
      })
      .on('broadcast', {event: 'ORDER_CANCELLED'}, ({payload}: any) => {
        Toast.show({
          type: 'info',
          text1: 'Order cancelled',
          text2: typeof payload?.reason === 'string' ? payload.reason : undefined,
        });
        clearActiveOrder();
      })
      .subscribe((status, err) => {
        if (status !== 'SUBSCRIBED') {
          console.warn('[realtime] orderById status:', status, err);
        }
      });
    return () => {
      try { supa.removeChannel(channel); } catch { /* ignore */ }
    };
  }, [orderId]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Per-customer discovery channel — only when no local order exists ─────
  const discoveryFetching = useRef(false);
  useEffect(() => {
    const supa = supabase;
    if (!supa || !customerId || orderId) return undefined;
    const channel = supa
      .channel(Channels.orderCustomer(customerId), {config: {private: true}})
      .on('broadcast', {event: 'ORDER_STATUS'}, async ({payload}: any) => {
        const status: string | undefined = payload?.status;
        if (!status || isTerminal(status)) return;
        if (discoveryFetching.current) return;
        discoveryFetching.current = true;
        try {
          const {data} = await ordersAPI.getActive();
          if (data.order) setActiveOrder(data.order);
        } catch { /* ignore */ }
        finally { discoveryFetching.current = false; }
      })
      .subscribe((status, err) => {
        if (status !== 'SUBSCRIBED') {
          console.warn('[realtime] orderCustomer status:', status, err);
        }
      });
    return () => {
      try { supa.removeChannel(channel); } catch { /* ignore */ }
    };
  }, [customerId, orderId]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render gate ──────────────────────────────────────────────────────────
  const shouldRender = useMemo(
    () => isAuthenticated
      && !!activeOrder
      && isActive(activeOrder.status)
      && TAB_ROUTES.has(routeName ?? ''),
    [isAuthenticated, activeOrder, routeName],
  );

  if (!shouldRender || !activeOrder) return null;

  const isReady = activeOrder.status === 'READY';
  const label = STATUS_LABELS[activeOrder.status] ?? activeOrder.status;

  return (
    <View style={[styles.wrap, {bottom: 64 + insets.bottom}]} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.bar, isReady && styles.barReady]}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`View active order #${activeOrder.shortRef}, ${label}`}
        onPress={() => {
          if (navRef.isReady()) {
            navRef.navigate('OrderDetail', {orderId: activeOrder.id});
          }
        }}
      >
        <Icon name="silverware-fork-knife" size={18} color={Colors.white} />
        <Text style={styles.ref}>#{activeOrder.shortRef}</Text>
        <Text style={[styles.status, isReady && styles.statusReady]} numberOfLines={1}>
          {label}
        </Text>
        <Icon name="chevron-right" size={20} color={'rgba(255,255,255,0.85)'} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position:          'absolute',
    left:              0,
    right:             0,
    paddingHorizontal: Spacing.outer,
  },
  bar: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.sm,
    backgroundColor:   Colors.textDark,
    borderRadius:      Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.sm + 2,
    ...Shadow.card,
  },
  barReady: {
    backgroundColor: Colors.success,
  },
  ref: {
    fontFamily: 'Inter-Medium',
    fontSize:   12,
    color:      'rgba(255,255,255,0.7)',
    fontVariant: ['tabular-nums'],
  },
  status: {
    fontFamily: 'Inter-SemiBold',
    fontSize:   13,
    color:      Colors.white,
    flex:       1,
  },
  statusReady: {
    color: Colors.white,
  },
});
