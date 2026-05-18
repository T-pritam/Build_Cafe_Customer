import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MainStackParamList} from '../../navigation/types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import RazorpayCheckout from 'react-native-razorpay';
import Config from 'react-native-config';
import {Colors, Spacing, Radius, Shadow} from '../../theme';
import {useCartStore} from '../../store/cartStore';
import {useAuthStore} from '../../store/authStore';
import {VegBadge} from '../../components/VegBadge';
import {Button} from '../../components/Button';
import {PushFriendSelectorModal} from '../../components/PushFriendSelectorModal';
import {ordersAPI, pushRequestsAPI} from '../../services/api';

export const CartScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {
    items, updateQuantity, clearCart, totalAmount,
    tableNumber, sessionId,
    rewardPointsApplied, setRewardPointsApplied,
    outgoingPushes, removeOutgoingPush, restoreOutgoingPush,
  } = useCartStore();
  const {user} = useAuthStore();
  const [loading, setLoading]           = useState(false);
  const [pushModalVisible, setPushModalVisible] = useState(false);

  const total = totalAmount();
  const gst   = total * 0.05;

  const rewardDiscount = Math.min(rewardPointsApplied * 0.1, total + gst);
  const grandTotal     = Math.max(0, total + gst - rewardDiscount);
  const maxRedeemablePoints = Math.floor((total + gst) / 0.1);
  const availablePoints     = user?.rewardPointsBalance ?? 0;

  // ── Edge case 9: hydrate outgoing pushes on screen focus ───────────────────
  // The cartStore's outgoingPushes is the source of truth during the session,
  // but if the app restarts we re-fetch from DB to repopulate.
  useFocusEffect(
    useCallback(() => {
      if (!sessionId) return;
      pushRequestsAPI.outgoing(sessionId).then(res => {
        // Only sync pushIds not already tracked locally to avoid losing
        // the items snapshot we need for restoration.
        const trackedIds = new Set(outgoingPushes.map(p => p.pushId));
        res.data.pushRequests.forEach(p => {
          if (!trackedIds.has(p.id)) {
            // Items came from a DB-only push (e.g. app restarted mid-push).
            // We don't have the CartItem snapshot, so we can't restore on reject.
            // Just display it so the user can see it's pending and cancel.
            useCartStore.getState().addOutgoingPush({
              pushId:        p.id,
              toDisplayName: p.toSession.displayName,
              items:         [],  // empty — can't restore without snapshot
            });
          }
        });
      }).catch(() => {});
    }, [sessionId]),
  );

  const cancelPush = async (pushId: string) => {
    try {
      await pushRequestsAPI.cancel(pushId);
      restoreOutgoingPush(pushId);
    } catch (e: any) {
      Toast.show({type: 'error', text1: 'Could not cancel', text2: e?.message});
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      Toast.show({type: 'error', text1: 'Your cart is empty'});
      return;
    }
    if (!sessionId) {
      Toast.show({
        type:           'info',
        text1:          'Scan your table QR code first',
        text2:          'Open your phone camera and point it at the QR code on your table. Your cart will be saved.',
        visibilityTime: 5000,
      });
      return;
    }
    setLoading(true);
    try {
      // Edge case 6: pass originalSessionId and pushRequestId for KOT sub-headers
      const orderItems = items.map(i => ({
        menuItemId:        i.id,
        quantity:          i.quantity,
        unitPrice:         i.price,
        modifiers:         i.modifiers.map(m => ({name: m.name, price: m.price})),
        originalSessionId: i.originalSessionId,
        pushRequestId:     i.pushRequestId,
      }));

      const res = await ordersAPI.create({
        sessionId,
        items: orderItems,
        rewardPointsToRedeem: rewardPointsApplied,
        paymentMode: grandTotal === 0 ? 'REWARD_POINTS' : 'UPI',
      });

      const orderId = res.data.orderId;

      if (grandTotal === 0) {
        clearCart();
        navigation.navigate('OrderSuccess', {
          orderId,
          tableNumber: tableNumber ?? '',
          totalAmount: '0',
        });
        return;
      }

      const rzpOptions = {
        description: 'Build Cafe Order',
        currency:    res.data.currency ?? 'INR',
        key:         res.data.keyId || Config.RAZORPAY_KEY_ID,
        amount:      res.data.amountPaise,
        order_id:    res.data.razorpayOrderId,
        name:        'Build Cafe',
        prefill: {
          contact: user?.phone ?? '',
          email:   user?.email ?? '',
        },
        theme: {color: Colors.accent},
      };

      await RazorpayCheckout.open(rzpOptions);
      // Edge case 5: clearCart only called on payment SUCCESS — items from
      // accepted pushes are preserved if payment fails or is cancelled.
      clearCart();
      navigation.navigate('OrderSuccess', {
        orderId,
        tableNumber: tableNumber ?? '',
        totalAmount: grandTotal.toFixed(2),
      });
    } catch (e: any) {
      if (e?.code !== 'PAYMENT_CANCELLED') {
        Toast.show({
          type:  'error',
          text1: 'Order failed',
          text2: e?.message ?? 'Please try again',
        });
      }
      // Edge case 5: no cart clearing — items remain for retry
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && outgoingPushes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} translucent={false} />
        <View style={[styles.topBar, {paddingTop: insets.top + Spacing.md}]}>
          <Text style={styles.topBarTitle}>Your Order</Text>
          <TouchableOpacity
            style={styles.tableChip}
            onPress={() => navigation.navigate('QRScanner', {context: 'rescan'})}>
            <Icon name="silverware" size={14} color={Colors.white} />
            <Text style={styles.tableChipText}>Table {tableNumber}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContent}>
          <Icon name="shopping-outline" size={64} color={Colors.border} />
          <Text style={styles.emptyTitle}>Your cart is empty.</Text>
          <Text style={styles.emptySubtitle}>
            Add something from the menu to get started.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} translucent={false} />

      <View style={[styles.topBar, {paddingTop: insets.top + Spacing.md}]}>
        <Text style={styles.topBarTitle}>Your Order</Text>
        <TouchableOpacity
          style={styles.tableChip}
          onPress={() => navigation.navigate('QRScanner', {context: 'rescan'})}>
          <Icon name="silverware" size={14} color={Colors.white} />
          <Text style={styles.tableChipText}>Table {tableNumber}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── Outgoing pushes (edge case 9) ─────────────────────────── */}
        {outgoingPushes.length > 0 && (
          <View style={styles.outgoingSection}>
            <Text style={styles.sectionLabel}>Pending pushes</Text>
            {outgoingPushes.map(push => (
              <View key={push.pushId} style={styles.outgoingRow}>
                <View style={styles.outgoingInfo}>
                  <Icon name="account-arrow-right" size={16} color={Colors.accent} />
                  <Text style={styles.outgoingText}>
                    Waiting for {push.toDisplayName}…
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.cancelPushBtn}
                  onPress={() => cancelPush(push.pushId)}>
                  <Text style={styles.cancelPushText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── Cart items ───────────────────────────────────────────────── */}
        {items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </Text>

            {items.map(item => {
              const modifierTotal = item.modifiers.reduce((s, m) => s + m.price, 0);
              const linePrice = item.price + modifierTotal;
              return (
                <View key={item.cartKey} style={styles.cartItem}>
                  {item.image ? (
                    <Image
                      source={{uri: item.image}}
                      style={styles.itemImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                      <Icon name="food" size={24} color={Colors.border} />
                    </View>
                  )}
                  <View style={styles.itemContent}>
                    <View style={styles.itemNameRow}>
                      <VegBadge isVeg={item.isVeg} />
                      <Text style={styles.itemName}>{item.name}</Text>
                    </View>
                    {item.modifiers.length > 0 && (
                      <Text style={styles.itemModifiers}>
                        + {item.modifiers.map(m => m.name).join(', ')}
                      </Text>
                    )}
                    {item.fromDisplayName && (
                      <Text style={styles.itemFrom}>From {item.fromDisplayName}</Text>
                    )}
                    <Text style={styles.itemPrice}>
                      ₹{linePrice.toFixed(0)} × {item.quantity}
                    </Text>
                  </View>
                  <View style={styles.qtyControl}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.cartKey, item.quantity - 1)}>
                      <Icon name="minus" size={14} color={Colors.textDark} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.cartKey, item.quantity + 1)}>
                      <Icon name="plus" size={14} color={Colors.textDark} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {/* Edge case 9: push to friend — only when in an active table session */}
            {sessionId && (
              <TouchableOpacity
                style={styles.pushFriendBtn}
                onPress={() => setPushModalVisible(true)}>
                <Icon name="account-arrow-right" size={18} color={Colors.accent} />
                <Text style={styles.pushFriendText}>Push to a friend at this table</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Reward points redemption */}
        {availablePoints > 0 && (
          <View style={styles.rewardCard}>
            <View style={styles.rewardHeader}>
              <Icon name="star-circle" size={20} color={Colors.accent} />
              <Text style={styles.rewardTitle}>
                {availablePoints} reward pts available
              </Text>
            </View>
            {rewardPointsApplied === 0 ? (
              <TouchableOpacity
                style={styles.rewardApplyBtn}
                onPress={() =>
                  setRewardPointsApplied(Math.min(availablePoints, maxRedeemablePoints))
                }>
                <Text style={styles.rewardApplyText}>
                  Apply (saves ₹{(Math.min(availablePoints, maxRedeemablePoints) * 0.1).toFixed(0)})
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.rewardRemoveBtn}
                onPress={() => setRewardPointsApplied(0)}>
                <Text style={styles.rewardRemoveText}>
                  Remove (−₹{rewardDiscount.toFixed(0)})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Bill summary */}
        {items.length > 0 && (
          <View style={styles.billCard}>
            <Text style={styles.billTitle}>Bill Summary</Text>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Subtotal</Text>
              <Text style={styles.billValue}>₹{total.toFixed(2)}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>GST (5%)</Text>
              <Text style={styles.billValue}>₹{gst.toFixed(2)}</Text>
            </View>
            {rewardPointsApplied > 0 && (
              <View style={styles.billRow}>
                <Text style={[styles.billLabel, {color: Colors.success}]}>
                  Reward Points
                </Text>
                <Text style={[styles.billValue, {color: Colors.success}]}>
                  −₹{rewardDiscount.toFixed(2)}
                </Text>
              </View>
            )}
            <View style={[styles.billRow, styles.billTotalRow]}>
              <Text style={styles.billTotalLabel}>Total</Text>
              <Text style={styles.billTotalValue}>₹{grandTotal.toFixed(2)}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {items.length > 0 && (
        <View style={styles.checkoutBar}>
          <View>
            <Text style={styles.checkoutTotal}>₹{grandTotal.toFixed(2)}</Text>
            <Text style={styles.checkoutMeta}>{items.length} items · incl. GST</Text>
          </View>
          <Button
            label={loading ? 'Placing…' : 'Place Order'}
            onPress={handleCheckout}
            loading={loading}
            style={styles.checkoutBtn}
          />
        </View>
      )}

      {/* Edge case 9: push friend selector */}
      {sessionId && (
        <PushFriendSelectorModal
          visible={pushModalVisible}
          onClose={() => setPushModalVisible(false)}
          sessionId={sessionId}
          items={items}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container:      {flex: 1, backgroundColor: Colors.background},
  emptyContainer: {flex: 1, backgroundColor: Colors.background},
  topBar: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.outer,
    paddingBottom:  Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topBarTitle: {fontFamily: 'Fraunces-SemiBold', fontSize: 24, color: Colors.textDark},
  tableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.textDark,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  tableChipText: {fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.white},
  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle:    {fontFamily: 'Fraunces-SemiBold', fontSize: 24, color: Colors.textDark},
  emptySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize:   15,
    color:      Colors.textMuted,
    textAlign:  'center',
  },
  scrollContent: {paddingBottom: 120, gap: Spacing.md},
  section:       {paddingHorizontal: Spacing.outer, paddingTop: Spacing.md, gap: Spacing.md},
  sectionLabel:  {
    fontFamily:    'Inter-SemiBold',
    fontSize:      13,
    color:         Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  outgoingSection: {
    paddingHorizontal: Spacing.outer,
    paddingTop:        Spacing.md,
    gap:               Spacing.sm,
  },
  outgoingRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.accentLight,
    borderRadius:   Radius.md,
    padding:        Spacing.md,
    borderWidth:    1,
    borderColor:    Colors.accent + '30',
  },
  outgoingInfo: {flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1},
  outgoingText: {fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textDark},
  cancelPushBtn: {
    borderWidth:    1,
    borderColor:    Colors.border,
    borderRadius:   Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  cancelPushText: {fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textMuted},
  cartItem: {
    flexDirection:  'row',
    alignItems:     'center',
    backgroundColor: Colors.white,
    borderRadius:   Radius.lg,
    padding:        Spacing.md,
    gap:            Spacing.md,
    ...Shadow.card,
    borderWidth:    1,
    borderColor:    Colors.border + '30',
  },
  itemImage:            {width: 60, height: 60, borderRadius: Radius.sm},
  itemImagePlaceholder: {
    backgroundColor: Colors.inputBg,
    alignItems:      'center',
    justifyContent:  'center',
  },
  itemContent:  {flex: 1, gap: 4},
  itemNameRow:  {flexDirection: 'row', alignItems: 'center', gap: 6},
  itemName:     {fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.textDark, flex: 1},
  itemModifiers:{fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.accent},
  itemFrom:     {fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textMuted, fontStyle: 'italic'},
  itemPrice:    {fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textMuted},
  qtyControl: {
    flexDirection:  'row',
    alignItems:     'center',
    backgroundColor: Colors.inputBg,
    borderRadius:   Radius.full,
    borderWidth:    1,
    borderColor:    Colors.border,
    paddingHorizontal: 4,
    gap:            4,
  },
  qtyBtn:  {width: 30, height: 30, alignItems: 'center', justifyContent: 'center'},
  qtyText: {
    fontFamily: 'Inter-SemiBold',
    fontSize:   14,
    color:      Colors.textDark,
    minWidth:   22,
    textAlign:  'center',
  },
  pushFriendBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            8,
    paddingVertical: Spacing.sm,
    alignSelf:      'flex-start',
  },
  pushFriendText: {
    fontFamily: 'Inter-SemiBold',
    fontSize:   14,
    color:      Colors.accent,
  },
  rewardCard: {
    marginHorizontal: Spacing.outer,
    backgroundColor:  Colors.accentLight,
    borderRadius:     Radius.lg,
    padding:          Spacing.md,
    gap:              Spacing.sm,
    borderWidth:      1,
    borderColor:      Colors.accent + '40',
  },
  rewardHeader:    {flexDirection: 'row', alignItems: 'center', gap: 8},
  rewardTitle:     {fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textDark},
  rewardApplyBtn:  {
    alignSelf:      'flex-start',
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius:   Radius.full,
  },
  rewardApplyText: {fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.white},
  rewardRemoveBtn: {
    alignSelf:      'flex-start',
    borderWidth:    1,
    borderColor:    Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius:   Radius.full,
  },
  rewardRemoveText: {fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.accent},
  billCard: {
    marginHorizontal: Spacing.outer,
    backgroundColor:  Colors.white,
    borderRadius:     Radius.lg,
    padding:          Spacing.md,
    gap:              Spacing.sm,
    borderWidth:      1,
    borderColor:      Colors.border + '30',
    ...Shadow.card,
  },
  billTitle:    {fontFamily: 'Fraunces-SemiBold', fontSize: 18, color: Colors.textDark, marginBottom: 4},
  billRow:      {flexDirection: 'row', justifyContent: 'space-between'},
  billLabel:    {fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textMuted},
  billValue:    {fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textDark},
  billTotalRow: {
    marginTop:        Spacing.sm,
    paddingTop:       Spacing.sm,
    borderTopWidth:   1,
    borderTopColor:   Colors.border,
  },
  billTotalLabel: {fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.textDark},
  billTotalValue: {fontFamily: 'Fraunces-Bold', fontSize: 20, color: Colors.textDark},
  checkoutBar: {
    position:       'absolute',
    bottom:         0,
    left:           0,
    right:          0,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.outer,
    paddingVertical:   Spacing.md,
    paddingBottom:     Spacing.lg,
    backgroundColor:   Colors.white,
    borderTopWidth:    1,
    borderTopColor:    Colors.border,
  },
  checkoutTotal: {fontFamily: 'Fraunces-Bold', fontSize: 22, color: Colors.textDark},
  checkoutMeta:  {fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textMuted},
  checkoutBtn:   {flex: 1, marginLeft: Spacing.md, height: 48},
});
