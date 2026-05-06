import React, {useState, useCallback, useEffect} from 'react';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MainStackParamList} from '../../navigation/types';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Spacing, Radius, Shadow} from '../../theme';
import {useCartStore} from '../../store/cartStore';
import {ordersAPI} from '../../services/api';
import {supabase, Channels} from '../../services/supabase';

dayjs.extend(relativeTime);

type OrderStatus =
  | 'PAYMENT_PENDING' | 'KOT_GENERATED' | 'NEW' | 'PREPARING' | 'READY'
  | 'PICKUP_CLAIMED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';

interface Order {
  id: string;
  status: OrderStatus;
  totalAmount: string;
  createdAt: string;
  items: Array<{name: string; quantity: number; unitPrice: string}>;
}

const STATUS_CONFIG: Record<
  string,
  {label: string; color: string; bg: string; icon: string}
> = {
  NEW: {label: 'Received', color: Colors.accentLightText, bg: Colors.accentLight, icon: 'check-circle-outline'},
  PREPARING: {label: 'Preparing', color: Colors.accentLightText, bg: Colors.accentLight, icon: 'fire'},
  READY: {label: 'Ready', color: Colors.success, bg: Colors.successLight, icon: 'check-circle'},
  PICKUP_CLAIMED: {label: 'Pickup Claimed', color: Colors.success, bg: Colors.successLight, icon: 'run-fast'},
  OUT_FOR_DELIVERY: {label: 'On the Way', color: Colors.success, bg: Colors.successLight, icon: 'bike'},
  DELIVERED: {label: 'Delivered', color: Colors.textMuted, bg: Colors.inputBg, icon: 'check-all'},
  COMPLETED: {label: 'Completed', color: Colors.textMuted, bg: Colors.inputBg, icon: 'check-all'},
  CANCELLED: {label: 'Cancelled', color: Colors.error, bg: '#FFF0F0', icon: 'close-circle'},
  PAYMENT_PENDING: {label: 'Payment Pending', color: Colors.textMuted, bg: Colors.inputBg, icon: 'clock-outline'},
  KOT_GENERATED: {label: 'Confirmed', color: Colors.accentLightText, bg: Colors.accentLight, icon: 'receipt'},
};

const ACTIVE_STATUSES: OrderStatus[] = [
  'PAYMENT_PENDING', 'KOT_GENERATED', 'NEW', 'PREPARING', 'READY',
  'PICKUP_CLAIMED', 'OUT_FOR_DELIVERY', 'DELIVERED',
];

export const OrdersScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const sessionId = useCartStore(s => s.sessionId);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await ordersAPI.listByUser();
      setOrders(res.data.orders as Order[]);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders]),
  );

  // Realtime: update order status when broadcast arrives
  useEffect(() => {
    if (!sessionId || !supabase) {return;}
    const channel = supabase
      .channel(Channels.orderSession(sessionId))
      .on('broadcast', {event: 'ORDER_STATUS'}, ({payload}) => {
        const {orderId, status} = payload as {orderId: string; status: OrderStatus};
        setOrders(prev =>
          prev.map(o => (o.id === orderId ? {...o, status} : o)),
        );
      })
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [sessionId]);

  const active = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const past = orders.filter(o => !ACTIVE_STATUSES.includes(o.status) && o.status !== 'PAYMENT_PENDING');
  const displayed = activeTab === 'active' ? active : past;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} translucent={false} />

      <View style={[styles.topBar, {paddingTop: insets.top + Spacing.md}]}>
        <Text style={styles.topBarTitle}>Orders</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'active' && styles.tabTextActive,
            ]}>
            Active {active.length > 0 ? `(${active.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'past' && styles.tabTextActive,
            ]}>
            Past Orders
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {setRefreshing(true); fetchOrders();}}
            tintColor={Colors.accent}
          />
        }>
        {displayed.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="receipt" size={56} color={Colors.border} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtitle}>
              Your orders will appear here once you place them.
            </Text>
          </View>
        ) : (
          displayed.map(order => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.NEW;
            return (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => navigation.navigate('OrderDetail', {orderId: order.id})}>
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.orderId}>
                      #{order.id.slice(-6).toUpperCase()}
                    </Text>
                    <Text style={styles.orderTime}>
                      {dayjs(order.createdAt).fromNow()}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, {backgroundColor: cfg.bg}]}>
                    <Icon name={cfg.icon} size={13} color={cfg.color} />
                    <Text style={[styles.statusText, {color: cfg.color}]}>
                      {cfg.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemsList}>
                  {order.items.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemQty}>{item.quantity}×</Text>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemPrice}>
                        ₹{(parseFloat(item.unitPrice) * item.quantity).toFixed(0)}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.divider} />

                <View style={styles.orderFooter}>
                  <Text style={styles.tableText} />
                  <Text style={styles.orderTotal}>
                    ₹{parseFloat(order.totalAmount).toFixed(0)}
                  </Text>
                </View>

                {order.status === 'PREPARING' && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressBar, {width: '40%'}]} />
                    </View>
                    <Text style={styles.progressText}>Est. ready in 12–15 mins</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  centered: {alignItems: 'center', justifyContent: 'center'},
  topBar: {
    paddingHorizontal: Spacing.outer,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topBarTitle: {fontFamily: 'Fraunces-SemiBold', fontSize: 24, color: Colors.textDark},
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.outer,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {backgroundColor: Colors.textDark, borderColor: Colors.textDark},
  tabText: {fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textDark},
  tabTextActive: {color: Colors.white},
  scrollContent: {
    paddingHorizontal: Spacing.outer,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  emptyState: {alignItems: 'center', paddingTop: 80, gap: Spacing.md},
  emptyTitle: {fontFamily: 'Fraunces-SemiBold', fontSize: 22, color: Colors.textDark},
  emptySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.card,
    borderWidth: 1,
    borderColor: Colors.border + '30',
    gap: Spacing.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderId: {fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.textDark},
  orderTime: {fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textMuted, marginTop: 2},
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  itemsList: {gap: 4},
  itemRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  itemQty: {fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textMuted, width: 24},
  itemName: {flex: 1, fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textDark},
  itemPrice: {fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textDark},
  divider: {height: 1, backgroundColor: Colors.border + '50'},
  orderFooter: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  tableText: {fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textMuted},
  orderTotal: {fontFamily: 'Fraunces-Bold', fontSize: 20, color: Colors.textDark},
  progressContainer: {gap: 6},
  progressTrack: {
    height: 4,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressBar: {height: '100%', backgroundColor: Colors.accent, borderRadius: Radius.full},
  progressText: {fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textMuted, fontStyle: 'italic'},
});
