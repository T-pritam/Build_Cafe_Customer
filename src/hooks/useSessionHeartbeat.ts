import {useEffect, useRef, useState, useCallback} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import {useShallow} from 'zustand/react/shallow';
import Toast from 'react-native-toast-message';
import {useCartStore} from '../store/cartStore';
import {sessionsAPI} from '../services/api';
import {supabase, Channels} from '../services/supabase';

// ── Timing constants (frontend side) ─────────────────────────────────────────
// Keep BROWSE_TIMEOUT_MINUTES in sync with SESSION_CONFIG.BROWSE_TIMEOUT_MINUTES
// in BuildCafeBackend/src/config/sessionConfig.ts
const HEARTBEAT_INTERVAL_MS  = 60_000; // how often we ping the server
const BROWSE_TIMEOUT_MINUTES = 5;      // match backend SESSION_CONFIG.BROWSE_TIMEOUT_MINUTES
const WARN_BEFORE_SECONDS    = 60;     // show warning this many seconds before timeout
const EXPIRED_TOAST_MS       = 3_000;  // how long the final "session expired" toast stays
// ─────────────────────────────────────────────────────────────────────────────

interface HeartbeatState {
  showExpiryWarning: boolean;
  secondsLeft: number;
  extendSession: () => Promise<void>;
}

export function useSessionHeartbeat(): HeartbeatState {
  const {sessionId, sessionStartedAt, clearSessionOnly, resetSessionTimer} = useCartStore(
    useShallow(s => ({
      sessionId:         s.sessionId,
      sessionStartedAt:  s.sessionStartedAt,
      clearSessionOnly:  s.clearSessionOnly,
      resetSessionTimer: s.resetSessionTimer,
    })),
  );

  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const [secondsLeft, setSecondsLeft]             = useState(0);
  const intervalRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef        = useRef<AppStateStatus>(AppState.currentState);
  const extraHeartbeatSent = useRef(false);

  const clearTimers = () => {
    if (intervalRef.current)  clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    intervalRef.current  = null;
    countdownRef.current = null;
  };

  const handleExpired = () => {
    clearTimers();
    clearSessionOnly();
    setShowExpiryWarning(false);
    Toast.show({
      type:           'info',
      text1:          'Table session ended',
      text2:          'Scan the QR code on your table to continue ordering.',
      visibilityTime: EXPIRED_TOAST_MS,
    });
  };

  useEffect(() => {
    if (!sessionId || !sessionStartedAt) {
      clearTimers();
      setShowExpiryWarning(false);
      extraHeartbeatSent.current = false;
      return;
    }

    const sendHeartbeat = async () => {
      // Skip heartbeat when app is in background
      if (appStateRef.current !== 'active') return;
      try {
        await sessionsAPI.heartbeat(sessionId);
      } catch (err: any) {
        const msg: string = err?.message ?? '';
        if (msg.includes('SESSION_SOFT_EXPIRED') || msg.includes('410') || err?.response?.status === 410) {
          handleExpired();
        }
      }
    };

    extraHeartbeatSent.current = false;

    // Start heartbeat interval
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    // Also send immediately on session start
    sendHeartbeat();

    // Countdown ticker: checks browse timeout and shows warning.
    // At expiry, we let the next heartbeat (or realtime SESSION_TERMINATED) call
    // handleExpired(), which shows a 3s toast and hides the warning banner —
    // the banner never stays in a permanent "0s" state.
    countdownRef.current = setInterval(() => {
      if (!sessionStartedAt) return;
      const elapsedMs   = Date.now() - sessionStartedAt;
      const timeoutMs   = BROWSE_TIMEOUT_MINUTES * 60_000;
      const remainingMs = timeoutMs - elapsedMs;
      const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));

      if (remainingMs <= 0) {
        // Hide the countdown banner; fire one extra heartbeat so server confirms
        // expiry quickly. handleExpired() will fire the toast + clear local state.
        setShowExpiryWarning(false);
        if (!extraHeartbeatSent.current) {
          extraHeartbeatSent.current = true;
          sendHeartbeat();
        }
      } else if (remainingSec <= WARN_BEFORE_SECONDS) {
        setShowExpiryWarning(true);
        setSecondsLeft(remainingSec);
      } else {
        setShowExpiryWarning(false);
      }
    }, 1_000);

    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      appStateRef.current = next;
      if (next === 'active') {
        // Resume: immediately send a heartbeat so we catch expiry fast
        sendHeartbeat();
      }
    });

    // Realtime: server terminates session (admin force-close or expiry cron)
    const rtChannel = supabase
      ?.channel(Channels.orderSession(sessionId), {config: {private: true}})
      .on('broadcast', {event: 'SESSION_TERMINATED'}, () => {
        handleExpired();
      })
      .subscribe((status, err) => {
        if (status !== 'SUBSCRIBED') {
          console.warn('[realtime] heartbeat/orderSession status:', status, err);
        }
      });

    return () => {
      clearTimers();
      subscription.remove();
      if (rtChannel && supabase) supabase.removeChannel(rtChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, sessionStartedAt]);

  const extendSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      await sessionsAPI.heartbeat(sessionId);
      resetSessionTimer();
      setShowExpiryWarning(false);
      extraHeartbeatSent.current = false;
      Toast.show({type: 'success', text1: 'Session extended', visibilityTime: 2000});
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      if (msg.includes('SESSION_SOFT_EXPIRED') || msg.includes('410') || err?.response?.status === 410) {
        handleExpired();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, resetSessionTimer]);

  return {showExpiryWarning, secondsLeft, extendSession};
}
