import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import {Colors, Spacing, Radius, Shadow, Typography} from '../../theme';
import type {MainStackParamList} from '../../navigation/types';
import {useCartStore} from '../../store/cartStore';
import {useAuthStore} from '../../store/authStore';
import {cubeAPI, feedbackAPI, CubeOrder} from '../../services/api';
import {supabase, Channels} from '../../services/supabase';
import {getOrCreateFingerprint} from '../../utils/fingerprint';

type Props = NativeStackScreenProps<MainStackParamList, 'CubeTracking'>;

const STEPPER_STATUSES = [
  {key: 'KOT_GENERATED',    label: 'Order placed'},
  {key: 'PREPARING',        label: 'Preparing'},
  {key: 'READY',            label: 'Ready'},
  {key: 'OUT_FOR_DELIVERY', label: 'On the way'},
  {key: 'DELIVERED',        label: 'Delivered'},
] as const;

function statusToStep(status: string): number {
  // Map all intermediate statuses to the nearest stepper step
  switch (status) {
    case 'PAYMENT_PENDING':  return -1;
    case 'KOT_GENERATED':
    case 'NEW':              return 0;
    case 'PREPARING':        return 1;
    case 'READY':
    case 'PICKUP_CLAIMED':   return 2;
    case 'OUT_FOR_DELIVERY': return 3;
    case 'DELIVERED':
    case 'COMPLETED':        return 4;
    default:                 return -1;
  }
}

interface FeedbackDraft {
  [menuItemId: string]: {rating: number; comment: string};
}

export const CubeTrackingScreen: React.FC<Props> = ({route, navigation}) => {
  const {qrCodeToken} = route.params;
  const {user}        = useAuthStore();
  const {setCubeSession, sessionId: activeSessionId} = useCartStore();

  const [loading,         setLoading]         = useState(true);
  const [sessionId,       setSessionId]       = useState<string | null>(null);
  const [cubeNumber,      setCubeNumber]      = useState<number | null>(null);
  const [orders,          setOrders]          = useState<CubeOrder[]>([]);
  const [releasedVisible, setReleasedVisible] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackDraft,   setFeedbackDraft]   = useState<FeedbackDraft>({});
  const [submittingFb,    setSubmittingFb]    = useState(false);

  // Initialise cube session on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fp          = await getOrCreateFingerprint();
        const displayName = user?.name?.slice(0, 20) ?? 'Guest';
        const res         = await cubeAPI.scan({qrCodeToken, displayName, deviceFingerprint: fp});
        if (cancelled) return;

        const {sessionId: sid, cubeNumber: cn, cubeId, displayName: dn} = res.data;
        setSessionId(sid);
        setCubeNumber(cn);
        setCubeSession(cubeId, sid, cn);

        if (res.data.resumed) {
          Toast.show({type: 'info', text1: `Welcome back, ${dn}!`, text2: `Cube ${String(cn).padStart(2, '0')} resumed`});
        }

        // Hydrate orders
        const ordRes = await cubeAPI.bySession(sid);
        if (!cancelled) setOrders(ordRes.data.orders);
      } catch (e: any) {
        if (!cancelled) {
          Toast.show({type: 'error', text1: 'Could not load cube', text2: e?.message});
          navigation.goBack();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [qrCodeToken, user, setCubeSession, navigation]);

  // Realtime subscriptions (order status + cube release)
  useEffect(() => {
    if (!sessionId || !supabase) return;

    const orderCh = supabase.channel(Channels.orderSession(sessionId), {config: {private: true}});
    const cubeCh  = supabase.channel(Channels.cubeSession(sessionId), {config: {private: true}});

    orderCh
      .on('broadcast', {event: 'ORDER_STATUS'}, ({payload}) => {
        const {orderId, status} = payload as {orderId: string; status: string};
        setOrders(prev =>
          prev.map(o => o.id === orderId ? {...o, status} : o),
        );
        if (status === 'DELIVERED') {
          setFeedbackVisible(true);
        }
      })
      .on('broadcast', {event: 'ORDER_CANCELLED'}, ({payload}) => {
        const {orderId, reason} = payload as {orderId: string; reason: string};
        setOrders(prev =>
          prev.map(o => o.id === orderId ? {...o, status: 'CANCELLED'} : o),
        );
        Toast.show({
          type:           'info',
          text1:          'Order cancelled',
          text2:          reason === 'CUSTOMER_LEFT'
            ? 'Cube auto-released — customer left.'
            : 'Your cube order was cancelled.',
          visibilityTime: 4000,
        });
      })
      .subscribe((status, err) => {
        if (status !== 'SUBSCRIBED') {
          console.warn('[realtime] cubeTracking/orderSession status:', status, err);
        }
      });

    cubeCh
      .on('broadcast', {event: 'CUBE_RELEASED'}, () => {
        setReleasedVisible(true);
      })
      .subscribe((status, err) => {
        if (status !== 'SUBSCRIBED') {
          console.warn('[realtime] cubeSession status:', status, err);
        }
      });

    return () => {
      supabase!.removeChannel(orderCh);
      supabase!.removeChannel(cubeCh);
    };
  }, [sessionId]);

  const handleAddMore = useCallback(() => {
    navigation.navigate('Tabs');
  }, [navigation]);

  const handleFeedbackSubmit = useCallback(async (order: CubeOrder) => {
    const entries = Object.entries(feedbackDraft);
    if (entries.length === 0) {
      Toast.show({type: 'error', text1: 'Please rate at least one item'});
      return;
    }
    setSubmittingFb(true);
    try {
      const items = entries.map(([menuItemId, v]) => {
        const orderItem = order.items.find(i => i.menuItemId === menuItemId);
        return {
          menuItemId,
          orderItemId: orderItem?.id,
          rating:      v.rating,
          comment:     v.comment || undefined,
        };
      });
      await feedbackAPI.submit({orderId: order.id, items});
      Toast.show({type: 'success', text1: 'Thanks for your feedback!'});
      setFeedbackVisible(false);
      setFeedbackDraft({});
    } catch (e: any) {
      Toast.show({type: 'error', text1: 'Could not submit feedback', text2: e?.message});
    } finally {
      setSubmittingFb(false);
    }
  }, [feedbackDraft]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accent} size="large" />
        <Text style={styles.loadingText}>Connecting to your cube…</Text>
      </View>
    );
  }

  // Most recent non-cancelled order for the stepper
  const latestOrder = orders[0] ?? null;
  const currentStep = latestOrder ? statusToStep(latestOrder.status) : -1;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.cubeLabel}>
          Cube {cubeNumber !== null ? String(cubeNumber).padStart(2, '0') : '--'}
        </Text>
        {latestOrder && (
          <Text style={styles.statusLabel}>{latestOrder.status.replace(/_/g, ' ')}</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Cube cleared banner */}
        {releasedVisible && (
          <View style={styles.releasedBanner}>
            <Text style={styles.releasedText}>Your cube has been cleared. Thank you!</Text>
          </View>
        )}

        {/* Status stepper */}
        {latestOrder && currentStep >= 0 && (
          <View style={styles.stepperCard}>
            <View style={styles.stepper}>
              {STEPPER_STATUSES.map((step, idx) => {
                const done    = idx <= currentStep;
                const current = idx === currentStep;
                return (
                  <View key={step.key} style={styles.stepItem}>
                    <View style={[
                      styles.stepDot,
                      done    && styles.stepDotDone,
                      current && styles.stepDotCurrent,
                    ]} />
                    {idx < STEPPER_STATUSES.length - 1 && (
                      <View style={[styles.stepLine, done && styles.stepLineDone]} />
                    )}
                    <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Orders list */}
        {orders.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your orders</Text>
            {orders.map(order => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderStatus}>{order.status.replace(/_/g, ' ')}</Text>
                  <Text style={styles.orderAmount}>₹{parseFloat(order.totalAmount).toFixed(0)}</Text>
                </View>
                {order.items.map((item, idx) => (
                  <Text key={idx} style={styles.orderItem}>
                    {item.name} × {item.quantity}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No orders yet. Add items from the menu!</Text>
        )}

        {/* Inline feedback (shown after DELIVERED) */}
        {feedbackVisible && latestOrder && latestOrder.status === 'DELIVERED' && (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>How was your order?</Text>
            {latestOrder.items.map(item => (
              <View key={item.menuItemId} style={styles.feedbackItem}>
                <Text style={styles.feedbackItemName}>{item.name}</Text>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map(star => {
                    const current = feedbackDraft[item.menuItemId]?.rating ?? 0;
                    return (
                      <TouchableOpacity
                        key={star}
                        onPress={() =>
                          setFeedbackDraft(d => ({
                            ...d,
                            [item.menuItemId]: {
                              rating:  star,
                              comment: d[item.menuItemId]?.comment ?? '',
                            },
                          }))
                        }>
                        <Text style={[styles.star, star <= current && styles.starFilled]}>
                          ★
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {feedbackDraft[item.menuItemId]?.rating > 0 && (
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Add a comment (optional)"
                    placeholderTextColor={Colors.textMuted}
                    value={feedbackDraft[item.menuItemId]?.comment ?? ''}
                    onChangeText={text =>
                      setFeedbackDraft(d => ({
                        ...d,
                        [item.menuItemId]: {
                          rating:  d[item.menuItemId]?.rating ?? 0,
                          comment: text,
                        },
                      }))
                    }
                  />
                )}
              </View>
            ))}
            <View style={styles.feedbackActions}>
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => { setFeedbackVisible(false); setFeedbackDraft({}); }}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, submittingFb && styles.btnDisabled]}
                onPress={() => handleFeedbackSubmit(latestOrder)}
                disabled={submittingFb}>
                {submittingFb
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <Text style={styles.submitText}>Submit</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add more items */}
      {!releasedVisible && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.addMoreBtn} onPress={handleAddMore}>
            <Text style={styles.addMoreText}>+ Add more items</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.textMuted,
  },
  header: {
    paddingHorizontal: Spacing.outer,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cubeLabel: {
    fontFamily: 'Fraunces-SemiBold',
    fontSize: 28,
    color: Colors.textDark,
  },
  statusLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.accent,
    textTransform: 'capitalize',
  },
  scroll: {
    padding: Spacing.outer,
    gap: Spacing.md,
    paddingBottom: 100,
  },
  releasedBanner: {
    backgroundColor: Colors.successLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  releasedText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.success,
  },
  stepperCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.card,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    zIndex: 1,
  },
  stepDotDone: {
    backgroundColor: Colors.accent,
  },
  stepDotCurrent: {
    width: 16,
    height: 16,
    borderWidth: 3,
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
  stepLine: {
    position: 'absolute',
    top: 6,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: Colors.border,
    zIndex: 0,
  },
  stepLineDone: {
    backgroundColor: Colors.accent,
  },
  stepLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  stepLabelDone: {
    color: Colors.accent,
    fontFamily: 'Inter-SemiBold',
  },
  section: {gap: Spacing.sm},
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.textDark,
  },
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
    ...Shadow.card,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  orderStatus: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.accent,
    textTransform: 'capitalize',
  },
  orderAmount: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.textDark,
  },
  orderItem: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  feedbackCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.card,
  },
  feedbackTitle: {
    fontFamily: 'Fraunces-SemiBold',
    fontSize: 18,
    color: Colors.textDark,
  },
  feedbackItem: {gap: Spacing.xs},
  feedbackItemName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.textDark,
  },
  stars: {flexDirection: 'row', gap: Spacing.xs},
  star: {
    fontSize: 24,
    color: Colors.border,
  },
  starFilled: {color: Colors.accent},
  commentInput: {
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.textDark,
  },
  feedbackActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'flex-end',
  },
  skipBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  skipText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.textMuted,
  },
  submitBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  btnDisabled: {opacity: 0.5},
  submitText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.white,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.outer,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  addMoreBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadow.button,
  },
  addMoreText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.white,
  },
});
