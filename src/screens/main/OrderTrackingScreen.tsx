import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {Colors, Spacing, Radius, Shadow} from '../../theme';
import {MainStackParamList} from '../../navigation/types';
import {supabase, Channels} from '../../services/supabase';

type OrderStatus =
  | 'KOT_GENERATED' | 'NEW' | 'PREPARING' | 'READY'
  | 'PICKUP_CLAIMED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';

const STEPS: {status: OrderStatus; label: string; icon: string}[] = [
  {status: 'NEW',              label: 'Order received',    icon: 'check-circle-outline'},
  {status: 'PREPARING',       label: 'Being prepared',    icon: 'fire'},
  {status: 'READY',           label: 'Ready for pickup',  icon: 'bell-ring'},
  {status: 'OUT_FOR_DELIVERY',label: 'On the way',        icon: 'bike'},
  {status: 'DELIVERED',       label: 'Delivered',         icon: 'check-all'},
];

const STATUS_RANK: Record<string, number> = {
  KOT_GENERATED: 0, NEW: 1, PREPARING: 2, READY: 3,
  PICKUP_CLAIMED: 3, OUT_FOR_DELIVERY: 4, DELIVERED: 5, COMPLETED: 5,
};

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'OrderTracking'>;
  route: RouteProp<MainStackParamList, 'OrderTracking'>;
};

export const OrderTrackingScreen: React.FC<Props> = ({navigation, route}) => {
  const insets = useSafeAreaInsets();
  const {orderId, initialStatus, tableNumber, totalAmount} = route.params;
  const [status, setStatus] = useState<OrderStatus>(initialStatus as OrderStatus);

  useEffect(() => {
    if (!supabase) {return;}
    const channel = supabase
      .channel(`order_tracking_${orderId}`)
      .on('broadcast', {event: 'ORDER_STATUS'}, ({payload}) => {
        if (payload.orderId === orderId) {
          setStatus(payload.status as OrderStatus);
        }
      })
      .subscribe();
    return () => {supabase?.removeChannel(channel);};
  }, [orderId]);

  const currentRank = STATUS_RANK[status] ?? 0;
  const isCancelled = status === 'CANCELLED';
  const isComplete = status === 'DELIVERED' || status === 'COMPLETED';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} translucent={false} />

      <View style={[styles.topBar, {paddingTop: insets.top + Spacing.md}]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Order Tracking</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Order summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Table</Text>
            <Text style={styles.summaryValue}>{tableNumber}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Order total</Text>
            <Text style={styles.summaryValue}>₹{totalAmount}</Text>
          </View>
        </View>

        {isCancelled ? (
          <View style={styles.cancelledCard}>
            <Icon name="close-circle" size={48} color={Colors.error} />
            <Text style={styles.cancelledTitle}>Order Cancelled</Text>
            <Text style={styles.cancelledSubtitle}>
              This order was cancelled. Contact staff if you have questions.
            </Text>
          </View>
        ) : (
          <View style={styles.stepsCard}>
            {STEPS.map((step, idx) => {
              const rank = idx + 1;
              const done = currentRank >= rank;
              const active = currentRank + 1 === rank;
              const isLast = idx === STEPS.length - 1;

              return (
                <View key={step.status} style={styles.stepRow}>
                  <View style={styles.stepLeft}>
                    <View style={[styles.stepDot, done && styles.stepDotDone, active && styles.stepDotActive]}>
                      {done ? (
                        <Icon name="check" size={14} color={Colors.white} />
                      ) : (
                        <View style={[styles.stepDotInner, active && styles.stepDotInnerActive]} />
                      )}
                    </View>
                    {!isLast && <View style={[styles.stepLine, done && styles.stepLineDone]} />}
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepLabel, done && styles.stepLabelDone, active && styles.stepLabelActive]}>
                      {step.label}
                    </Text>
                    {active && (
                      <Text style={styles.stepSubtitle}>In progress…</Text>
                    )}
                  </View>
                  <Icon
                    name={step.icon}
                    size={20}
                    color={done ? Colors.success : active ? Colors.accent : Colors.border}
                  />
                </View>
              );
            })}
          </View>
        )}

        {isComplete && (
          <TouchableOpacity
            style={styles.feedbackBtn}
            onPress={() => navigation.goBack()}>
            <Text style={styles.feedbackBtnText}>Rate your order</Text>
            <Icon name="star-outline" size={18} color={Colors.accent} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.outer,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {padding: 4},
  topBarTitle: {fontFamily: 'Fraunces-SemiBold', fontSize: 20, color: Colors.textDark},
  placeholder: {width: 30},
  scroll: {padding: Spacing.outer, gap: Spacing.md},
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.card,
    borderWidth: 1,
    borderColor: Colors.border + '30',
  },
  summaryRow: {flexDirection: 'row', justifyContent: 'space-between'},
  summaryLabel: {fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textMuted},
  summaryValue: {fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textDark},
  cancelledCard: {
    backgroundColor: '#FFF0F0',
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  cancelledTitle: {fontFamily: 'Fraunces-Bold', fontSize: 22, color: Colors.error},
  cancelledSubtitle: {fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textMedium, textAlign: 'center'},
  stepsCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.card,
    borderWidth: 1,
    borderColor: Colors.border + '30',
  },
  stepRow: {flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, minHeight: 56},
  stepLeft: {alignItems: 'center', width: 24},
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {backgroundColor: Colors.success},
  stepDotActive: {backgroundColor: Colors.accent},
  stepDotInner: {width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.white},
  stepDotInnerActive: {backgroundColor: Colors.white},
  stepLine: {width: 2, flex: 1, backgroundColor: Colors.border, marginTop: 4},
  stepLineDone: {backgroundColor: Colors.success},
  stepContent: {flex: 1, paddingTop: 2},
  stepLabel: {fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textMuted},
  stepLabelDone: {fontFamily: 'Inter-SemiBold', color: Colors.textDark},
  stepLabelActive: {fontFamily: 'Inter-SemiBold', color: Colors.accent},
  stepSubtitle: {fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textMuted, marginTop: 2},
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.full,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  feedbackBtnText: {fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.accent},
});
