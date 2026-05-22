import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import RazorpayCheckout from 'react-native-razorpay';
import Toast from 'react-native-toast-message';
import {Colors, Spacing, Radius, Shadow} from '../../theme';
import {MainStackParamList} from '../../navigation/types';
import {ordersAPI} from '../../services/api';
import {supabase, Channels} from '../../services/supabase';

type OrderStatus =
  | 'PAYMENT_PENDING' | 'KOT_GENERATED' | 'NEW' | 'PREPARING' | 'READY'
  | 'PICKUP_CLAIMED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';

const STEPS: {status: OrderStatus; label: string; icon: string}[] = [
  {status: 'NEW',               label: 'Order received',   icon: 'check-circle-outline'},
  {status: 'PREPARING',        label: 'Being prepared',   icon: 'fire'},
  {status: 'READY',            label: 'Ready',            icon: 'bell-ring'},
  {status: 'OUT_FOR_DELIVERY', label: 'On the way',       icon: 'bike'},
  {status: 'DELIVERED',        label: 'Delivered',        icon: 'check-all'},
];

const STATUS_RANK: Record<string, number> = {
  KOT_GENERATED: 0, NEW: 1, PREPARING: 2, READY: 3,
  PICKUP_CLAIMED: 3, OUT_FOR_DELIVERY: 4, DELIVERED: 5, COMPLETED: 5,
};

type OrderDetail = {
  id: string;
  status: string;
  orderType: string;
  paymentMode: string | null;
  subtotal: string;
  gstAmount: string;
  discountAmount: string;
  rewardPointsRedeemed: number;
  pointsEarned: number;
  totalAmount: string;
  createdAt: string;
  sessionId: string | null;
  tableNumber: number | null;
  cubeNumber: number | null;
  razorpayOrderId: string | null;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: string;
    modifiers: Array<{name: string; price: number}>;
    imageUrl: string | null;
    isVeg: boolean;
  }>;
  statusHistory: Array<{status: string; createdAt: string}>;
};

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'OrderDetail'>;
  route: RouteProp<MainStackParamList, 'OrderDetail'>;
};

export const OrderDetailScreen: React.FC<Props> = ({navigation, route}) => {
  const insets = useSafeAreaInsets();
  const {orderId} = route.params;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await ordersAPI.getOrderDetail(orderId);
      setOrder(res.data);
    } catch (e: any) {
      Toast.show({type: 'error', text1: 'Failed to load order', text2: e?.message});
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Realtime tracking via session channel
  useEffect(() => {
    if (!order?.sessionId || !supabase) {return;}
    const channel = supabase
      .channel(Channels.orderSession(order.sessionId))
      .on('broadcast', {event: 'ORDER_STATUS'}, ({payload}) => {
        if (payload.orderId === orderId) {
          setOrder(prev => prev ? {...prev, status: payload.status} : prev);
        }
      })
      .on('broadcast', {event: 'ORDER_CANCELLED'}, ({payload}) => {
        if (payload.orderId !== orderId) {return;}
        const isAdminFreed = payload.reason === 'TABLE_FREED_BY_ADMIN';
        Toast.show({
          type:           'info',
          text1:          'Order cancelled',
          text2:          isAdminFreed
            ? 'The cafe freed your table. Please rescan the QR to continue.'
            : 'Your order was cancelled.',
          visibilityTime: 4000,
        });
        navigation.goBack();
      })
      .subscribe();
    return () => {supabase?.removeChannel(channel);};
  }, [orderId, order?.sessionId, navigation]);

  const handleRetryPayment = async () => {
    if (!order) {return;}
    setRetrying(true);
    try {
      const res = await ordersAPI.retryPayment(orderId);
      const {razorpayOrderId, amountPaise, currency, keyId} = res.data;

      await RazorpayCheckout.open({
        key: keyId,
        amount: amountPaise,
        currency,
        order_id: razorpayOrderId,
        name: 'Build Cafe',
        description: `Order #${orderId.slice(-6).toUpperCase()}`,
        theme: {color: Colors.accent},
      });

      // Payment succeeded — re-fetch to get updated status
      await fetchOrder();
      Toast.show({type: 'success', text1: 'Payment successful!'});
    } catch (e: any) {
      if (e?.code !== 'PAYMENT_CANCELLED') {
        Toast.show({type: 'error', text1: 'Payment failed', text2: e?.description ?? e?.message});
      }
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = order.status as OrderStatus;
  const currentRank = STATUS_RANK[status] ?? -1;
  const isCancelled = status === 'CANCELLED';
  const isPaymentPending = status === 'PAYMENT_PENDING';

  const subtotal   = parseFloat(order.subtotal);
  const gst        = parseFloat(order.gstAmount);
  const discount   = parseFloat(order.discountAmount);
  const total      = parseFloat(order.totalAmount);

  const locationLabel = order.cubeNumber != null
    ? `Cube #${order.cubeNumber}`
    : order.tableNumber != null
    ? `Table #${order.tableNumber}`
    : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} translucent={false} />

      {/* Header */}
      <View style={[styles.topBar, {paddingTop: insets.top + Spacing.md}]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
          Order #{orderId.slice(-6).toUpperCase()}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingBottom: insets.bottom + Spacing.xl}]}
        showsVerticalScrollIndicator={false}>

        {/* Tracking stepper */}
        {!isPaymentPending && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {isCancelled ? 'Order Cancelled' : 'Order Status'}
            </Text>
            {isCancelled ? (
              <View style={styles.cancelledRow}>
                <Icon name="close-circle" size={20} color={Colors.error} />
                <Text style={styles.cancelledText}>
                  This order was cancelled. Contact staff for assistance.
                </Text>
              </View>
            ) : (
              STEPS.map((step, idx) => {
                const stepRank = STATUS_RANK[step.status] ?? idx + 1;
                const done = currentRank >= stepRank;
                const active = currentRank === stepRank;
                return (
                  <View key={step.status} style={styles.stepRow}>
                    <View style={styles.stepLeft}>
                      <View style={[
                        styles.stepDot,
                        done && styles.stepDotDone,
                        active && styles.stepDotActive,
                      ]}>
                        <Icon
                          name={done ? 'check' : step.icon}
                          size={13}
                          color={done ? Colors.white : active ? Colors.accent : Colors.textMuted}
                        />
                      </View>
                      {idx < STEPS.length - 1 && (
                        <View style={[styles.stepLine, done && styles.stepLineDone]} />
                      )}
                    </View>
                    <Text style={[
                      styles.stepLabel,
                      done && styles.stepLabelDone,
                      active && styles.stepLabelActive,
                    ]}>
                      {step.label}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Payment pending banner */}
        {isPaymentPending && (
          <View style={styles.pendingBanner}>
            <Icon name="clock-outline" size={20} color={Colors.textMuted} />
            <Text style={styles.pendingText}>Payment not completed for this order.</Text>
          </View>
        )}

        {/* Location / order info */}
        {locationLabel && (
          <View style={styles.infoRow}>
            <Icon name="map-marker-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.infoText}>{locationLabel}</Text>
          </View>
        )}

        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Items</Text>
          {order.items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              {item.imageUrl ? (
                <Image source={{uri: item.imageUrl}} style={styles.itemImage} />
              ) : (
                <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                  <Icon name="food" size={18} color={Colors.textMuted} />
                </View>
              )}
              <View style={styles.itemInfo}>
                <View style={styles.itemNameRow}>
                  <View style={[styles.vegDot, {borderColor: item.isVeg ? Colors.veg : Colors.error}]}>
                    <View style={[styles.vegDotInner, {backgroundColor: item.isVeg ? Colors.veg : Colors.error}]} />
                  </View>
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>
                {item.modifiers.length > 0 && (
                  <Text style={styles.modifierText}>
                    {item.modifiers.map(m => m.name).join(', ')}
                  </Text>
                )}
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.itemQty}>{item.quantity}×</Text>
                <Text style={styles.itemPrice}>
                  ₹{(parseFloat(item.unitPrice) * item.quantity).toFixed(0)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bill breakdown */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Bill</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Subtotal</Text>
            <Text style={styles.billValue}>₹{subtotal.toFixed(0)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>GST</Text>
            <Text style={styles.billValue}>₹{gst.toFixed(0)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Reward discount</Text>
              <Text style={[styles.billValue, styles.billDiscount]}>−₹{discount.toFixed(0)}</Text>
            </View>
          )}
          {order.rewardPointsRedeemed > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Points redeemed</Text>
              <Text style={[styles.billValue, styles.billDiscount]}>{order.rewardPointsRedeemed} pts</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.billRow}>
            <Text style={styles.billTotal}>Total</Text>
            <Text style={styles.billTotalValue}>₹{total.toFixed(0)}</Text>
          </View>
          {order.paymentMode && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Paid via</Text>
              <Text style={styles.billValue}>{order.paymentMode}</Text>
            </View>
          )}
          {order.pointsEarned > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Points earned</Text>
              <Text style={[styles.billValue, styles.billEarned]}>+{order.pointsEarned} pts</Text>
            </View>
          )}
        </View>

        {/* Retry payment */}
        {isPaymentPending && (
          <TouchableOpacity
            style={[styles.retryBtn, retrying && styles.retryBtnDisabled]}
            onPress={handleRetryPayment}
            disabled={retrying}>
            {retrying ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.retryBtnText}>Retry Payment</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  centered: {alignItems: 'center', justifyContent: 'center'},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.outer,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {marginRight: Spacing.sm, padding: 4},
  topBarTitle: {flex: 1, fontFamily: 'Fraunces-SemiBold', fontSize: 20, color: Colors.textDark},
  placeholder: {width: 30},
  scroll: {padding: Spacing.outer, gap: Spacing.md},
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.card,
    borderWidth: 1,
    borderColor: Colors.border + '30',
  },
  sectionTitle: {fontFamily: 'Inter-Bold', fontSize: 13, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4},
  // Stepper
  stepRow: {flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, minHeight: 36},
  stepLeft: {alignItems: 'center', width: 28},
  stepDot: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: Colors.inputBg,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotDone: {backgroundColor: Colors.success},
  stepDotActive: {backgroundColor: Colors.accentLight, borderWidth: 2, borderColor: Colors.accent},
  stepLine: {width: 2, flex: 1, backgroundColor: Colors.border, marginVertical: 2, minHeight: 12},
  stepLineDone: {backgroundColor: Colors.success},
  stepLabel: {fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textMuted, paddingTop: 6},
  stepLabelDone: {color: Colors.textDark},
  stepLabelActive: {fontFamily: 'Inter-SemiBold', color: Colors.accent},
  // Cancelled
  cancelledRow: {flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm},
  cancelledText: {fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.error, flex: 1},
  // Payment pending
  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  pendingText: {fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textMuted, flex: 1},
  // Info row
  infoRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  infoText: {fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textMuted},
  // Items
  itemRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4},
  itemImage: {width: 44, height: 44, borderRadius: Radius.sm},
  itemImagePlaceholder: {backgroundColor: Colors.inputBg, alignItems: 'center', justifyContent: 'center'},
  itemInfo: {flex: 1, gap: 2},
  itemNameRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  vegDot: {width: 12, height: 12, borderRadius: 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center'},
  vegDotInner: {width: 5, height: 5, borderRadius: 3},
  itemName: {fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textDark, flex: 1},
  modifierText: {fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textMuted},
  itemRight: {alignItems: 'flex-end'},
  itemQty: {fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textMuted},
  itemPrice: {fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textDark},
  // Bill
  billRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3},
  billLabel: {fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textMuted},
  billValue: {fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textDark},
  billDiscount: {color: Colors.success},
  billEarned: {color: Colors.accent, fontFamily: 'Inter-SemiBold'},
  divider: {height: 1, backgroundColor: Colors.border + '50', marginVertical: 4},
  billTotal: {fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.textDark},
  billTotalValue: {fontFamily: 'Fraunces-Bold', fontSize: 20, color: Colors.textDark},
  // Retry
  retryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    ...Shadow.card,
  },
  retryBtnDisabled: {opacity: 0.6},
  retryBtnText: {fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.white},
  // Error
  errorText: {fontFamily: 'Inter-Regular', fontSize: 16, color: Colors.textMuted, marginBottom: Spacing.md},
  backLink: {padding: Spacing.sm},
  backLinkText: {fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.accent},
});
