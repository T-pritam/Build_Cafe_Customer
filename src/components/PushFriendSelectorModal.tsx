import React, {useState, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  FlatList,
} from 'react-native';
import Toast from 'react-native-toast-message';
import {Colors, Spacing, Radius, Shadow} from '../theme';
import {CartItem, OutgoingPush, useCartStore} from '../store/cartStore';
import {sessionsAPI, pushRequestsAPI, PushCartItem} from '../services/api';

interface Peer {
  id: string;
  displayName: string;
}

interface Props {
  visible:   boolean;
  onClose:   () => void;
  sessionId: string;
  items:     CartItem[];
}

export const PushFriendSelectorModal: React.FC<Props> = ({
  visible,
  onClose,
  sessionId,
  items,
}) => {
  const {removeItem, addOutgoingPush} = useCartStore();

  const [peers, setPeers]           = useState<Peer[]>([]);
  const [loadingPeers, setLoadingPeers] = useState(false);
  const [confirming, setConfirming] = useState<Peer | null>(null);
  const [pushing, setPushing]       = useState(false);

  useEffect(() => {
    if (!visible) {
      setConfirming(null);
      return;
    }
    setLoadingPeers(true);
    sessionsAPI.tablePeers(sessionId)
      .then(res => setPeers(res.data.peers))
      .catch(() => setPeers([]))
      .finally(() => setLoadingPeers(false));
  }, [visible, sessionId]);

  const handleConfirmPush = async () => {
    if (!confirming) return;
    setPushing(true);
    try {
      // Edge case 6: preserve originalSessionId through push chain
      const pushItems: PushCartItem[] = items.map(i => ({
        menuItemId:        i.id,
        name:              i.name,
        quantity:          i.quantity,
        unitPrice:         i.price,
        modifiers:         i.modifiers.map(m => ({name: m.name, price: m.price})),
        originalSessionId: i.originalSessionId ?? i.pushRequestId
          ? i.originalSessionId  // keep existing chain origin
          : undefined,
      }));

      const res = await pushRequestsAPI.create({
        fromSessionId: sessionId,
        toSessionId:   confirming.id,
        items:         pushItems,
      });

      const outgoing: OutgoingPush = {
        pushId:        res.data.pushId,
        toDisplayName: confirming.displayName,
        items:         [...items],  // snapshot for restoration
      };

      // Remove pushed items from cart and track them as outgoing
      items.forEach(item => removeItem(item.cartKey));
      addOutgoingPush(outgoing);

      Toast.show({
        type:  'success',
        text1: `Pushed to ${confirming.displayName}`,
        text2: `Waiting for them to accept…`,
      });
      onClose();
    } catch (e: any) {
      Toast.show({type: 'error', text1: 'Push failed', text2: e?.message});
    } finally {
      setPushing(false);
    }
  };

  const totalAmount = items.reduce(
    (s, i) => s + (i.price + i.modifiers.reduce((ms, m) => ms + m.price, 0)) * i.quantity,
    0,
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {confirming ? (
            // ── Confirmation step ────────────────────────────────────────
            <>
              <Text style={styles.title}>Push to {confirming.displayName}?</Text>
              <Text style={styles.subtitle}>
                {items.reduce((s, i) => s + i.quantity, 0)} item(s) · ₹{totalAmount.toFixed(0)} will
                be removed from your cart and sent to their bill.
              </Text>
              <TouchableOpacity
                style={[styles.pushBtn, pushing && styles.btnDisabled]}
                onPress={handleConfirmPush}
                disabled={pushing}>
                {pushing
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <Text style={styles.pushBtnText}>Yes, Push</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={styles.backBtn} onPress={() => setConfirming(null)}>
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            </>
          ) : (
            // ── Peer list step ───────────────────────────────────────────
            <>
              <Text style={styles.title}>Push to a friend</Text>
              <Text style={styles.subtitle}>
                Who at this table should receive your {items.reduce((s, i) => s + i.quantity, 0)} item(s)?
              </Text>

              {loadingPeers ? (
                <ActivityIndicator color={Colors.accent} style={{marginVertical: Spacing.lg}} />
              ) : peers.length === 0 ? (
                <Text style={styles.emptyText}>
                  No other active sessions at this table right now.
                </Text>
              ) : (
                <FlatList
                  data={peers}
                  keyExtractor={p => p.id}
                  style={styles.list}
                  renderItem={({item: peer}) => (
                    <TouchableOpacity
                      style={styles.peerRow}
                      onPress={() => setConfirming(peer)}>
                      <Text style={styles.peerName}>{peer.displayName}</Text>
                      <Text style={styles.peerArrow}>›</Text>
                    </TouchableOpacity>
                  )}
                />
              )}

              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius:  Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.card,
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: 'Fraunces-SemiBold',
    fontSize: 22,
    color: Colors.textDark,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  list: {maxHeight: 280},
  peerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '50',
  },
  peerName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.textDark,
  },
  peerArrow: {
    fontFamily: 'Inter-Regular',
    fontSize: 20,
    color: Colors.textMuted,
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  pushBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  btnDisabled: {opacity: 0.5},
  pushBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.white,
  },
  backBtn: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  backBtnText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.textMuted,
  },
  cancelBtn: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.textMuted,
  },
});
