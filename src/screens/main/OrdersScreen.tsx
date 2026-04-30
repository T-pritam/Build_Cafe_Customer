import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {Colors, Spacing, Typography, Radius, Shadow} from '../../theme';

dayjs.extend(relativeTime);

const DUMMY_ORDERS = [
  {
    id: 'ORD001',
    status: 'preparing',
    createdAt: new Date(Date.now() - 8 * 60000),
    items: [
      {name: 'Filter Coffee', qty: 2, price: 120},
      {name: 'Bun Maska', qty: 1, price: 60},
    ],
    total: 300,
    tableNumber: '07',
  },
  {
    id: 'ORD002',
    status: 'ready',
    createdAt: new Date(Date.now() - 25 * 60000),
    items: [
      {name: 'Cold Brew', qty: 1, price: 180},
      {name: 'Avocado Toast', qty: 1, price: 220},
    ],
    total: 420,
    tableNumber: '07',
  },
  {
    id: 'ORD003',
    status: 'delivered',
    createdAt: new Date(Date.now() - 2 * 3600000),
    items: [{name: 'Masala Chai', qty: 3, price: 80}],
    total: 240,
    tableNumber: '07',
  },
];

const STATUS_CONFIG: Record<
  string,
  {label: string; color: string; bg: string; icon: string}
> = {
  preparing: {
    label: 'Preparing',
    color: Colors.accentLightText,
    bg: Colors.accentLight,
    icon: 'fire',
  },
  ready: {
    label: 'Ready',
    color: Colors.success,
    bg: Colors.successLight,
    icon: 'check-circle',
  },
  delivered: {
    label: 'Delivered',
    color: Colors.textMuted,
    bg: Colors.inputBg,
    icon: 'check-all',
  },
};

export const OrdersScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

  const active = DUMMY_ORDERS.filter(o =>
    ['preparing', 'ready'].includes(o.status),
  );
  const past = DUMMY_ORDERS.filter(o => o.status === 'delivered');
  const displayed = activeTab === 'active' ? active : past;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Orders</Text>
      </View>

      {/* Tabs */}
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
        showsVerticalScrollIndicator={false}>
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
            const cfg = STATUS_CONFIG[order.status];
            return (
              <TouchableOpacity key={order.id} style={styles.orderCard}>
                {/* Header */}
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.orderId}>#{order.id}</Text>
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

                {/* Items */}
                <View style={styles.itemsList}>
                  {order.items.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemQty}>{item.qty}×</Text>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemPrice}>
                        ₹{item.price * item.qty}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.divider} />

                {/* Footer */}
                <View style={styles.orderFooter}>
                  <Text style={styles.tableText}>Table {order.tableNumber}</Text>
                  <Text style={styles.orderTotal}>₹{order.total}</Text>
                </View>

                {/* Active order progress */}
                {order.status === 'preparing' && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressBar, {width: '40%'}]} />
                    </View>
                    <Text style={styles.progressText}>
                      Est. ready in 12–15 mins
                    </Text>
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
  topBar: {
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
  tabActive: {
    backgroundColor: Colors.textDark,
    borderColor: Colors.textDark,
  },
  tabText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.textDark,
  },
  tabTextActive: {color: Colors.white},
  scrollContent: {
    paddingHorizontal: Spacing.outer,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontFamily: 'Fraunces-SemiBold',
    fontSize: 22,
    color: Colors.textDark,
  },
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
  orderId: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
    color: Colors.textDark,
  },
  orderTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemQty: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.textMuted,
    width: 24,
  },
  itemName: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.textDark,
  },
  itemPrice: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.textDark,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border + '50',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },
  orderTotal: {
    fontFamily: 'Fraunces-Bold',
    fontSize: 20,
    color: Colors.textDark,
  },
  progressContainer: {gap: 6},
  progressTrack: {
    height: 4,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
  },
  progressText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});
