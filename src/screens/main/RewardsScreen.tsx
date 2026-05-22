import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors, Spacing, Radius, Shadow} from '../../theme';
import {MainStackParamList} from '../../navigation/types';
import {rewardsAPI, RewardTransaction} from '../../services/api';

const FIRST_BATCH = 50;
const PAGE_SIZE = 15;

const REASON_META: Record<string, {label: string; icon: string}> = {
  EARNED:           {label: 'Earned',     icon: 'star-plus'},
  REDEEMED:         {label: 'Redeemed',   icon: 'star-minus'},
  ADMIN_ADJUSTMENT: {label: 'Adjustment', icon: 'account-cog'},
  EXPIRY:           {label: 'Expired',    icon: 'clock-alert'},
};

export const RewardsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [balance, setBalance] = useState(0);
  const [worth, setWorth] = useState(0);
  const [txns, setTxns] = useState<RewardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const loadBalance = useCallback(async () => {
    try {
      const res = await rewardsAPI.balance();
      setBalance(res.data.points ?? 0);
      setWorth(res.data.worthInRupees ?? 0);
    } catch {}
  }, []);

  const loadFirst = useCallback(async () => {
    try {
      const res = await rewardsAPI.transactions({limit: FIRST_BATCH, offset: 0});
      setTxns(res.data.transactions);
      setHasMore(res.data.hasMore);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBalance();
    loadFirst();
  }, [loadBalance, loadFirst]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadBalance(), loadFirst()]);
    setRefreshing(false);
  }, [loadBalance, loadFirst]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const res = await rewardsAPI.transactions({limit: PAGE_SIZE, offset: txns.length});
      setTxns(prev => [...prev, ...res.data.transactions]);
      setHasMore(res.data.hasMore);
    } catch {
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, txns.length]);

  const renderItem = ({item}: {item: RewardTransaction}) => {
    const meta = REASON_META[item.reason] ?? {label: item.reason, icon: 'star'};
    const positive = item.delta >= 0;
    const orderRef = item.order ? `#${item.order.id.slice(-6).toUpperCase()}` : null;
    const date = new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const inner = (
      <View style={styles.txnRow}>
        <View style={[styles.txnIcon, positive ? styles.txnIconPos : styles.txnIconNeg]}>
          <Icon
            name={meta.icon}
            size={18}
            color={positive ? Colors.success : Colors.error}
          />
        </View>
        <View style={styles.txnInfo}>
          <Text style={styles.txnLabel}>{meta.label}</Text>
          <Text style={styles.txnSub}>
            {orderRef ? `Order ${orderRef} · ` : ''}
            {date}
          </Text>
          {item.note ? <Text style={styles.txnNote}>{item.note}</Text> : null}
        </View>
        <View style={styles.txnRight}>
          <Text style={[styles.txnDelta, positive ? styles.txnDeltaPos : styles.txnDeltaNeg]}>
            {positive ? '+' : ''}
            {item.delta} pts
          </Text>
          {item.rate != null && (
            <Text style={styles.txnRate}>₹{item.rate.toFixed(0)}/pt</Text>
          )}
        </View>
        {item.order && <Icon name="chevron-right" size={18} color={Colors.border} />}
      </View>
    );
    if (item.order) {
      const orderId = item.order.id;
      return (
        <TouchableOpacity onPress={() => navigation.navigate('OrderDetail', {orderId})}>
          {inner}
        </TouchableOpacity>
      );
    }
    return inner;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} translucent={false} />

      <View style={[styles.topBar, {paddingTop: insets.top + Spacing.md}]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>My Rewards</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.balanceCard}>
        <Icon name="star-circle" size={34} color={Colors.accent} />
        <Text style={styles.balanceValue}>{balance}</Text>
        <Text style={styles.balanceLabel}>Available points</Text>
        <Text style={styles.balanceWorth}>worth ₹{worth.toFixed(0)}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={txns}
          keyExtractor={t => t.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            txns.length > 0 ? <Text style={styles.listLabel}>Activity</Text> : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="star-outline" size={48} color={Colors.border} />
              <Text style={styles.emptyText}>No reward activity yet</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={styles.footer} color={Colors.accent} />
            ) : !hasMore && txns.length > 0 ? (
              <Text style={styles.footerEnd}>End of history</Text>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center'},
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
  balanceCard: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    margin: Spacing.outer,
    marginBottom: Spacing.sm,
    padding: Spacing.lg,
    gap: 2,
    ...Shadow.card,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  balanceValue: {fontFamily: 'Fraunces-Bold', fontSize: 40, color: Colors.textDark, marginTop: 4},
  balanceLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceWorth: {fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.accent, marginTop: 2},
  listContent: {paddingHorizontal: Spacing.outer, paddingBottom: Spacing.xl},
  listLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginVertical: Spacing.sm,
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  txnIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnIconPos: {backgroundColor: Colors.success + '20'},
  txnIconNeg: {backgroundColor: Colors.error + '20'},
  txnInfo: {flex: 1, gap: 2},
  txnLabel: {fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textDark},
  txnSub: {fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textMuted},
  txnNote: {fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textMuted, fontStyle: 'italic'},
  txnRight: {alignItems: 'flex-end'},
  txnDelta: {fontFamily: 'Inter-Bold', fontSize: 14},
  txnDeltaPos: {color: Colors.success},
  txnDeltaNeg: {color: Colors.error},
  txnRate: {fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textMuted},
  separator: {height: 1, backgroundColor: Colors.border + '40'},
  empty: {alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.xl * 2, gap: Spacing.sm},
  emptyText: {fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textMuted},
  footer: {paddingVertical: Spacing.md},
  footerEnd: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
});
