import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import {Colors, Spacing, Typography, Radius, Shadow} from '../../theme';
import {useCartStore} from '../../store/cartStore';
import {VegBadge} from '../../components/VegBadge';
import {Button} from '../../components/Button';
import Config from 'react-native-config';

export const CartScreen: React.FC = () => {
  const {items, updateQuantity, clearCart, totalAmount, tableNumber} =
    useCartStore();
  const total = totalAmount();

  const handleCheckout = () => {
    if (items.length === 0) {
      Toast.show({type: 'error', text1: 'Your cart is empty'});
      return;
    }
    // Razorpay integration placeholder
    const options = {
      description: 'Build Cafe Order',
      currency: 'INR',
      key: Config.RAZORPAY_KEY_ID,
      amount: total * 100,
      name: 'Build Cafe',
      prefill: {contact: '', email: ''},
      theme: {color: Colors.accent},
    };
    Toast.show({
      type: 'info',
      text1: 'Payment gateway coming soon',
      text2: `Total: ₹${total}`,
    });
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Your Order</Text>
          <View style={styles.tableChip}>
            <Text style={styles.tableChipText}>Table {tableNumber}</Text>
          </View>
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

  const gst = Math.round(total * 0.05);
  const grandTotal = total + gst;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Your Order</Text>
        <TouchableOpacity style={styles.tableChip}>
          <Text style={styles.tableChipText}>Table {tableNumber}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </Text>

          {items.map(item => (
            <View key={item.id} style={styles.cartItem}>
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
                <Text style={styles.itemPrice}>
                  ₹{item.price} × {item.quantity}
                </Text>
              </View>
              <View style={styles.qtyControl}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() =>
                    updateQuantity(item.id, item.quantity - 1)
                  }>
                  <Icon name="minus" size={14} color={Colors.textDark} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() =>
                    updateQuantity(item.id, item.quantity + 1)
                  }>
                  <Icon name="plus" size={14} color={Colors.textDark} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Add a note */}
        <TouchableOpacity style={styles.noteRow}>
          <Icon name="pencil-outline" size={18} color={Colors.textMuted} />
          <Text style={styles.noteText}>Add a note for the kitchen</Text>
          <Icon name="chevron-right" size={18} color={Colors.border} />
        </TouchableOpacity>

        {/* Bill summary */}
        <View style={styles.billCard}>
          <Text style={styles.billTitle}>Bill Summary</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Subtotal</Text>
            <Text style={styles.billValue}>₹{total}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>GST (5%)</Text>
            <Text style={styles.billValue}>₹{gst}</Text>
          </View>
          <View style={[styles.billRow, styles.billTotalRow]}>
            <Text style={styles.billTotalLabel}>Total</Text>
            <Text style={styles.billTotalValue}>₹{grandTotal}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom checkout bar */}
      <View style={styles.checkoutBar}>
        <View>
          <Text style={styles.checkoutTotal}>₹{grandTotal}</Text>
          <Text style={styles.checkoutMeta}>{items.length} items · incl. GST</Text>
        </View>
        <Button
          label="Place Order"
          onPress={handleCheckout}
          style={styles.checkoutBtn}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  emptyContainer: {flex: 1, backgroundColor: Colors.background},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.outer,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topBarTitle: {
    fontFamily: 'Fraunces-SemiBold',
    fontSize: 24,
    color: Colors.textDark,
  },
  tableChip: {
    backgroundColor: Colors.textDark,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  tableChipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.white,
  },
  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: 'Fraunces-SemiBold',
    fontSize: 24,
    color: Colors.textDark,
  },
  emptySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 120,
    gap: Spacing.md,
  },
  section: {
    paddingHorizontal: Spacing.outer,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  sectionLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.card,
    borderWidth: 1,
    borderColor: Colors.border + '30',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: Radius.sm,
  },
  itemImagePlaceholder: {
    backgroundColor: Colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {flex: 1, gap: 4},
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.textDark,
    flex: 1,
  },
  itemPrice: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 4,
    gap: 4,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.textDark,
    minWidth: 22,
    textAlign: 'center',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.outer,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border + '30',
    ...Shadow.card,
  },
  noteText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  billCard: {
    marginHorizontal: Spacing.outer,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border + '30',
    ...Shadow.card,
  },
  billTitle: {
    fontFamily: 'Fraunces-SemiBold',
    fontSize: 18,
    color: Colors.textDark,
    marginBottom: 4,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  billLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.textMuted,
  },
  billValue: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.textDark,
  },
  billTotalRow: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  billTotalLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: Colors.textDark,
  },
  billTotalValue: {
    fontFamily: 'Fraunces-Bold',
    fontSize: 20,
    color: Colors.textDark,
  },
  checkoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.outer,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  checkoutTotal: {
    fontFamily: 'Fraunces-Bold',
    fontSize: 22,
    color: Colors.textDark,
  },
  checkoutMeta: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  checkoutBtn: {
    flex: 1,
    marginLeft: Spacing.md,
    height: 48,
  },
});
