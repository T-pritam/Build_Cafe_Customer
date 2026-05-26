import {useState, useEffect, useCallback} from 'react';
import Toast from 'react-native-toast-message';
import {useCartStore} from '../store/cartStore';
import {pushRequestsAPI, PushCartItem} from '../services/api';
import {supabase, Channels} from '../services/supabase';

export interface IncomingPush {
  pushId:          string;
  fromDisplayName: string;
  totalAmount:     number;
  items:           PushCartItem[];
  expiresAt:       number;  // absolute ms timestamp — sourced from server
}

export function usePushRequests() {
  const {sessionId, addItem, removeOutgoingPush, restoreOutgoingPush} = useCartStore();
  const [queue, setQueue] = useState<IncomingPush[]>([]);

  // Hydrate incoming queue from DB on mount / sessionId change.
  // Catches PUSH_REQUEST events missed while the app was backgrounded.
  useEffect(() => {
    if (!sessionId) {
      setQueue([]);
      return;
    }

    pushRequestsAPI.incoming(sessionId).then(res => {
      const hydrated: IncomingPush[] = res.data.pushRequests.map(p => ({
        pushId:          p.id,
        fromDisplayName: p.fromSession.displayName,
        totalAmount:     parseFloat(p.totalAmount),
        items:           p.cartSnapshot,
        expiresAt:       new Date(p.expiresAt).getTime(),
      }));
      setQueue(hydrated);
    }).catch(() => {
      // Best-effort — Realtime events still populate the queue if this fails
    });
  }, [sessionId]);

  // Realtime subscription — handles both incoming pushes and sender-side
  // feedback events on the same channel.
  useEffect(() => {
    if (!sessionId || !supabase) return;

    const channel = supabase.channel(Channels.push(sessionId), {config: {private: true}});

    channel
      // ── Incoming push events ───────────────────────────────────────────
      .on('broadcast', {event: 'PUSH_REQUEST'}, ({payload}) => {
        const push: IncomingPush = {
          pushId:          payload.pushId as string,
          fromDisplayName: payload.fromDisplayName as string,
          totalAmount:     payload.totalAmount as number,
          items:           (payload.items as PushCartItem[]) ?? [],
          // Bug 5 fix: use server expiresAt for accurate countdown bar
          expiresAt:       payload.expiresAt
            ? new Date(payload.expiresAt as string).getTime()
            : Date.now() + 5 * 60 * 1000,
        };
        setQueue(q => {
          // Deduplicate: mount hydration may have already added this push
          if (q.some(p => p.pushId === push.pushId)) return q;
          return [...q, push];
        });
      })
      .on('broadcast', {event: 'PUSH_CANCELLED'}, ({payload}) => {
        setQueue(q => q.filter(p => p.pushId !== payload.pushId));
      })
      // Edge cases 1 + 2: EXPIRED and BOUNCED_BACK arrive on BOTH sender and
      // recipient channels.  For the recipient → remove from incoming queue.
      // For the sender → restoreOutgoingPush (no-op if not in outgoing).
      .on('broadcast', {event: 'PUSH_EXPIRED'}, ({payload}) => {
        setQueue(q => q.filter(p => p.pushId !== payload.pushId));
        restoreOutgoingPush(payload.pushId as string);
      })
      .on('broadcast', {event: 'PUSH_BOUNCED_BACK'}, ({payload}) => {
        // Edge case 2: recipient's overlay also needs to dismiss
        setQueue(q => q.filter(p => p.pushId !== payload.pushId));
        restoreOutgoingPush(payload.pushId as string);
      })
      // ── Sender-side feedback events ────────────────────────────────────
      .on('broadcast', {event: 'PUSH_ACCEPTED'}, ({payload}) => {
        // Our outgoing push was accepted by recipient — remove it (don't restore)
        removeOutgoingPush(payload.pushId as string);
      })
      .on('broadcast', {event: 'PUSH_REJECTED'}, ({payload}) => {
        restoreOutgoingPush(payload.pushId as string);
      })
      .on('broadcast', {event: 'PUSH_ITEMS_STRIPPED'}, ({payload}) => {
        // Edge case 7: push was accepted but some items were unavailable.
        // The push went through — remove from outgoing, don't restore.
        removeOutgoingPush(payload.pushId as string);
        const count = (payload.strippedMenuItemIds as string[] | undefined)?.length ?? 0;
        if (count > 0) {
          Toast.show({
            type:            'info',
            text1:           `${count} item(s) unavailable`,
            text2:           `Removed before adding to ${payload.recipientName}'s cart`,
            visibilityTime:  4000,
          });
        }
      })
      .subscribe((status, err) => {
        if (status !== 'SUBSCRIBED') {
          console.warn('[realtime] push status:', status, err);
        }
      });

    return () => {
      supabase!.removeChannel(channel);
    };
  }, [sessionId, removeOutgoingPush, restoreOutgoingPush]);

  // ── Accept an incoming push ─────────────────────────────────────────────────

  const acceptPush = useCallback(async (pushId: string) => {
    try {
      const res = await pushRequestsAPI.accept(pushId);

      if (res.data.allItemsUnavailable) {
        Toast.show({
          type:   'error',
          text1:  'All items unavailable',
          text2:  'Nothing could be added — the items are no longer on the menu.',
          visibilityTime: 4000,
        });
        return;
      }

      const {acceptedItems, unavailableItems} = res.data;

      // Edge cases 7 + 8: acceptedItems is present for both fresh accepts and
      // idempotent re-accepts (alreadyAccepted: true).
      if (acceptedItems && acceptedItems.length > 0) {
        const push = queue.find(p => p.pushId === pushId);
        const fromDisplayName = push?.fromDisplayName;

        acceptedItems.forEach(item => {
          addItem({
            id:               item.menuItemId,
            name:             item.name,
            price:            item.unitPrice,
            image:            undefined,
            isVeg:            false,
            modifiers:        item.modifiers.map(m => ({id: m.name, name: m.name, price: m.price})),
            fromDisplayName,
            pushRequestId:    pushId,
            originalSessionId: item.originalSessionId,  // edge case 6: preserve chain
          });
        });
      }

      if (unavailableItems && unavailableItems.length > 0) {
        Toast.show({
          type:            'info',
          text1:           `${unavailableItems.length} item(s) unavailable`,
          text2:           'They were removed from the push before adding to your cart.',
          visibilityTime:  4000,
        });
      }
    } catch (e: any) {
      Toast.show({type: 'error', text1: 'Could not accept', text2: e?.message});
    } finally {
      setQueue(q => q.filter(p => p.pushId !== pushId));
    }
  }, [queue, addItem]);

  // ── Reject an incoming push ─────────────────────────────────────────────────

  const rejectPush = useCallback(async (pushId: string) => {
    try {
      await pushRequestsAPI.reject(pushId);
    } catch {
      // Dismiss locally even if request fails
    } finally {
      setQueue(q => q.filter(p => p.pushId !== pushId));
    }
  }, []);

  return {queue, acceptPush, rejectPush};
}
