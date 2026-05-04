import React, {useEffect, useRef} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import {Colors, Spacing, Radius, Shadow} from '../theme';
import {usePushRequests, IncomingPush} from '../hooks/usePushRequests';

// ── Countdown bar ─────────────────────────────────────────────────────────────

const PUSH_TTL_MS = 5 * 60 * 1000;

const CountdownBar: React.FC<{expiresAt: number}> = ({expiresAt}) => {
  const widthAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const remaining = Math.max(0, expiresAt - Date.now());
    Animated.timing(widthAnim, {
      toValue:         0,
      duration:        remaining,
      useNativeDriver: false,
    }).start();
    return () => widthAnim.stopAnimation();
  }, [expiresAt, widthAnim]);

  return (
    <View style={barStyles.track}>
      <Animated.View
        style={[
          barStyles.fill,
          {width: widthAnim.interpolate({inputRange: [0, 1], outputRange: ['0%', '100%']})},
        ]}
      />
    </View>
  );
};

const barStyles = StyleSheet.create({
  track: {height: 3, backgroundColor: Colors.border, borderRadius: Radius.full, overflow: 'hidden'},
  fill:  {height: 3, backgroundColor: Colors.accent, borderRadius: Radius.full},
});

// ── Single push card modal ────────────────────────────────────────────────────

const PushCard: React.FC<{
  push:       IncomingPush;
  stackIndex: number;
  onAccept:   () => void;
  onReject:   () => void;
}> = ({push, stackIndex, onAccept, onReject}) => (
  <Modal key={push.pushId} visible transparent animationType="slide">
    <View style={[styles.overlay, {paddingBottom: 90 + stackIndex * 10}]}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {push.fromDisplayName} wants to add to your bill
        </Text>
        <Text style={styles.amount}>₹{push.totalAmount.toFixed(0)}</Text>

        <ScrollView style={styles.itemList} showsVerticalScrollIndicator={false}>
          {push.items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <Text style={styles.itemName}>
                {item.name} × {item.quantity}
              </Text>
              <Text style={styles.itemPrice}>
                ₹{(item.unitPrice * item.quantity).toFixed(0)}
              </Text>
            </View>
          ))}
        </ScrollView>

        <CountdownBar expiresAt={push.expiresAt} />

        <View style={styles.actions}>
          <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
            <Text style={styles.rejectText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
            <Text style={styles.acceptText}>Accept & Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// ── Exported overlay — mounts globally in RootNavigator ───────────────────────

export const PushRequestOverlay: React.FC = () => {
  const {queue, acceptPush, rejectPush} = usePushRequests();

  return (
    <>
      {queue.map((push, idx) => (
        <PushCard
          key={push.pushId}
          push={push}
          stackIndex={idx}
          onAccept={() => acceptPush(push.pushId)}
          onReject={() => rejectPush(push.pushId)}
        />
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    backgroundColor: Colors.background,
    borderTopLeftRadius:  Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.card,
  },
  title: {
    fontFamily: 'Fraunces-SemiBold',
    fontSize: 20,
    color: Colors.textDark,
  },
  amount: {
    fontFamily: 'Fraunces-Bold',
    fontSize: 28,
    color: Colors.accent,
  },
  itemList: {
    maxHeight: 160,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '40',
  },
  itemName: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.textDark,
    flex: 1,
  },
  itemPrice: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  rejectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  rejectText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.textMuted,
  },
  acceptBtn: {
    flex: 2,
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  acceptText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.white,
  },
});
