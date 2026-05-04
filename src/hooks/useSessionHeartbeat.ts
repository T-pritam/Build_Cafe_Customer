import {useEffect, useRef, useState} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import {useShallow} from 'zustand/react/shallow';
import {useCartStore} from '../store/cartStore';
import {sessionsAPI} from '../services/api';

// ── Timing constants (frontend side) ─────────────────────────────────────────
// Keep BROWSE_TIMEOUT_MINUTES in sync with SESSION_CONFIG.BROWSE_TIMEOUT_MINUTES
// in BuildCafeBackend/src/config/sessionConfig.ts
const HEARTBEAT_INTERVAL_MS  = 60_000; // how often we ping the server
const BROWSE_TIMEOUT_MINUTES = 15;     // match backend SESSION_CONFIG.BROWSE_TIMEOUT_MINUTES
const WARN_BEFORE_SECONDS    = 120;    // show warning this many seconds before timeout
// ─────────────────────────────────────────────────────────────────────────────

interface HeartbeatState {
  showExpiryWarning: boolean;
  secondsLeft: number;
}

export function useSessionHeartbeat(): HeartbeatState {
  const {sessionId, sessionStartedAt, clearSessionOnly, setSessionExpired} = useCartStore(
    useShallow(s => ({
      sessionId:         s.sessionId,
      sessionStartedAt:  s.sessionStartedAt,
      clearSessionOnly:  s.clearSessionOnly,
      setSessionExpired: s.setSessionExpired,
    })),
  );

  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const [secondsLeft, setSecondsLeft]             = useState(0);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef   = useRef<AppStateStatus>(AppState.currentState);

  const clearTimers = () => {
    if (intervalRef.current)  clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    intervalRef.current  = null;
    countdownRef.current = null;
  };

  const handleExpired = () => {
    clearTimers();
    clearSessionOnly();
    setSessionExpired(true);
    setShowExpiryWarning(false);
  };

  useEffect(() => {
    if (!sessionId || !sessionStartedAt) {
      clearTimers();
      setShowExpiryWarning(false);
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

    // Start heartbeat interval
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    // Also send immediately on session start
    sendHeartbeat();

    // Countdown ticker: checks browse timeout and shows warning
    countdownRef.current = setInterval(() => {
      if (!sessionStartedAt) return;
      const elapsedMs  = Date.now() - sessionStartedAt;
      const timeoutMs  = BROWSE_TIMEOUT_MINUTES * 60_000;
      const remainingMs = timeoutMs - elapsedMs;
      const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));

      if (remainingMs <= 0) {
        // Client-side time is up; the next heartbeat will confirm with server
        // but we proactively show warning and wait for the heartbeat 401 to clear
        setShowExpiryWarning(true);
        setSecondsLeft(0);
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

    return () => {
      clearTimers();
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, sessionStartedAt]);

  return {showExpiryWarning, secondsLeft};
}
