import React, {useEffect, useRef, useCallback} from 'react';
import {Linking, View, ActivityIndicator, Platform, Text, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import {NavigationContainer, createNavigationContainerRef} from '@react-navigation/native';
import {useAuthStore} from '../store/authStore';
import {useCartStore} from '../store/cartStore';
import {AuthNavigator} from './AuthNavigator';
import {MainNavigator} from './MainNavigator';
import {MainStackParamList} from './types';
import {
  requestNotificationPermission,
  getFCMToken,
  getDeviceId,
  onForegroundMessage,
  setBackgroundMessageHandler,
  onNotificationOpenedApp,
  getInitialNotification,
} from '../services/fcm';
import {tablesAPI, fcmTokensAPI, sessionsAPI} from '../services/api';
import {useSessionHeartbeat} from '../hooks/useSessionHeartbeat';
import Toast from 'react-native-toast-message';
import {Colors, Spacing, Radius, Shadow} from '../theme';
import {getOrCreateFingerprint} from '../utils/fingerprint';
import {PushRequestOverlay} from '../components/PushRequestOverlay';
import {ActiveOrderBar} from '../components/ActiveOrderBar';

export const navRef = createNavigationContainerRef<MainStackParamList>();

const APP_PLATFORM: 'ios' | 'android' | 'web' = Platform.OS === 'ios' ? 'ios' : 'android';

function parseURLParams(url: string): Record<string, string> {
  const queryString = url.includes('?') ? url.split('?')[1] : '';
  const params: Record<string, string> = {};
  queryString.split('&').forEach(pair => {
    const [k, v] = pair.split('=');
    if (k) {params[decodeURIComponent(k)] = decodeURIComponent(v ?? '');}
  });
  return params;
}

type DeepLinkResult =
  | {kind: 'table'; tableId: string}
  | {kind: 'cube'; qrCodeToken: string}
  | {kind: 'order'; orderId: string}
  | {kind: 'unknown'};

function parseDeepLink(url: string): DeepLinkResult {
  // New format: buildcafe://order/UUID
  const orderMatch = url.match(/\/\/(?:.*\/)?order\/([0-9a-f-]{36})/i);
  if (orderMatch) {return {kind: 'order', orderId: orderMatch[1]};}

  // New format: buildcafe://table/UUID
  const tableMatch = url.match(/\/\/(?:.*\/)?table\/([0-9a-f-]{36})/i);
  if (tableMatch) {return {kind: 'table', tableId: tableMatch[1]};}

  // New format: buildcafe://cube/TOKEN
  const cubeMatch = url.match(/\/\/(?:.*\/)?cube\/([^?&]+)/i);
  if (cubeMatch) {return {kind: 'cube', qrCodeToken: cubeMatch[1]};}

  // Legacy format: buildcafecustomer://scan?tableId=UUID
  const params = parseURLParams(url);
  if (params.tableId) {return {kind: 'table', tableId: params.tableId};}

  return {kind: 'unknown'};
}

export const RootNavigator: React.FC = () => {
  const {isAuthenticated, isHydrated, user, setDeviceId, setFcmToken, fcmToken: storedFcmToken, hydrate} = useAuthStore();
  const {pendingScan, setPendingScan, pendingCubeScan, setPendingCubeScan} = useCartStore();
  const fpRef = useRef<string>('');
  const {showExpiryWarning, secondsLeft, extendSession} = useSessionHeartbeat();

  useEffect(() => {
    getOrCreateFingerprint().then(fp => {fpRef.current = fp;});
  }, []);

  const handleTableDeepLink = useCallback(async (tableId: string) => {
    // Guard: if we're already in an active session for this exact table,
    // ignore the re-delivered deep link (common on Android resume).
    const currentState = useCartStore.getState();
    if (currentState.sessionId && currentState.tableId === tableId) {return;}

    try {
      const res = await tablesAPI.scan(tableId);
      const {tableNumber} = res.data;
      const tableNum = String(tableNumber).padStart(2, '0');

      if (!isAuthenticated) {
        setPendingScan({tableId, tableNumber: tableNum});
        return;
      }

      // Active session on a DIFFERENT table → confirm switch before terminating.
      if (currentState.sessionId && currentState.tableId && currentState.tableId !== tableId) {
        const oldNum = currentState.tableNumber;
        const oldSessionId = currentState.sessionId;
        Alert.alert(
          `Switch to Table ${tableNum}?`,
          `You're currently at Table ${oldNum}. Switching will end your current session and clear your cart.`,
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Switch',
              style: 'destructive',
              onPress: () => {
                sessionsAPI.terminate(oldSessionId).catch(() => {});
                useCartStore.getState().clearAll();
                if (navRef.isReady()) {
                  navRef.navigate('SessionNamePrompt', {tableId, tableNumber: tableNum});
                }
              },
            },
          ],
        );
        return;
      }

      if (navRef.isReady()) {
        navRef.navigate('SessionNamePrompt', {tableId, tableNumber: tableNum});
      }
    } catch (e: any) {
      Toast.show({type: 'error', text1: 'Could not read QR code', text2: e?.message});
    }
  }, [isAuthenticated, setPendingScan]);

  const handleCubeDeepLink = useCallback((qrCodeToken: string) => {
    if (!isAuthenticated) {
      setPendingCubeScan(qrCodeToken);
      return;
    }
    if (navRef.isReady()) {
      navRef.navigate('CubeTracking', {qrCodeToken});
    }
  }, [isAuthenticated, setPendingCubeScan]);

  const handleOrderDeepLink = useCallback((orderId: string) => {
    if (!isAuthenticated) {return;}
    if (navRef.isReady()) {
      navRef.navigate('OrderDetail', {orderId});
    }
  }, [isAuthenticated]);

  const handleDeepLink = useCallback((url: string) => {
    const link = parseDeepLink(url);
    if (link.kind === 'order') {
      handleOrderDeepLink(link.orderId);
    } else if (link.kind === 'table') {
      handleTableDeepLink(link.tableId);
    } else if (link.kind === 'cube') {
      handleCubeDeepLink(link.qrCodeToken);
    }
  }, [handleOrderDeepLink, handleTableDeepLink, handleCubeDeepLink]);

  // After login, redirect pending table scan to SessionNamePrompt
  useEffect(() => {
    if (!isAuthenticated || !user || !pendingScan) {return;}
    const {tableId, tableNumber} = pendingScan;
    setPendingScan(null);
    if (navRef.isReady()) {
      navRef.navigate('SessionNamePrompt', {tableId, tableNumber});
    }
  }, [isAuthenticated, user, pendingScan, setPendingScan]);

  // After login, redirect pending cube scan to CubeTracking
  useEffect(() => {
    if (!isAuthenticated || !user || !pendingCubeScan) {return;}
    const qrCodeToken = pendingCubeScan;
    setPendingCubeScan(null);
    if (navRef.isReady()) {
      navRef.navigate('CubeTracking', {qrCodeToken});
    }
  }, [isAuthenticated, user, pendingCubeScan, setPendingCubeScan]);

  // Background tap: app was in background, user tapped a notification
  useEffect(() => {
    if (!isAuthenticated) {return;}
    const unsub = onNotificationOpenedApp(msg => {
      const orderId = msg.data?.orderId as string | undefined;
      if (orderId && navRef.isReady()) {
        navRef.navigate('OrderDetail', {orderId});
      }
    });
    return unsub;
  }, [isAuthenticated]);

  // Killed-state tap: app was killed, user tapped a notification to launch it
  useEffect(() => {
    if (!isHydrated || !isAuthenticated) {return;}
    getInitialNotification().then(msg => {
      const orderId = msg?.data?.orderId as string | undefined;
      if (orderId && navRef.isReady()) {
        navRef.navigate('OrderDetail', {orderId});
      }
    });
  }, [isHydrated, isAuthenticated]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) {return;}

    setBackgroundMessageHandler();

    (async () => {
      const granted = await requestNotificationPermission();
      if (!granted) {return;}

      const [fcmToken, deviceId] = await Promise.all([getFCMToken(), getDeviceId()]);
      if (!fcmToken) {return;}

      setDeviceId(deviceId);

      try {
        if (fcmToken !== storedFcmToken) {
          await fcmTokensAPI.register({
            token:    fcmToken,
            deviceId,
            platform: APP_PLATFORM,
            app:      'customer',
          });
          setFcmToken(fcmToken);
        }

        if (isAuthenticated && user) {
          await fcmTokensAPI.register({
            token:    fcmToken,
            deviceId,
            platform: APP_PLATFORM,
            app:      'customer',
            userId:   user.id,
          });
        }
      } catch (e: any) {
        console.warn('[FCM] register failed:', e?.message);
      }
    })();

    const unsubFcm = onForegroundMessage(msg => {
      if (msg?.data?.otp) {return;}
      const {notification} = msg;
      if (notification?.title) {
        Toast.show({type: 'info', text1: notification.title, text2: notification.body});
      }
    });

    const subscription = Linking.addEventListener('url', ({url}) => handleDeepLink(url));
    Linking.getInitialURL().then(url => {
      if (url) {handleDeepLink(url);}
    });

    return () => {
      unsubFcm();
      subscription.remove();
    };
  }, [isHydrated, isAuthenticated, user, storedFcmToken, setDeviceId, setFcmToken, handleDeepLink]);

  if (!isHydrated) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer
        ref={navRef}
        linking={{
          prefixes: ['buildcafecustomer://', 'buildcafe://'],
          config: {screens: {}},
        }}>
        {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
      </NavigationContainer>

      <PushRequestOverlay />

      {/* Persistent active-order bar. Lives at the root so it's painted above
          MainNavigator's tab bar. Self-gates on auth + current route. */}
      <ActiveOrderBar />

      {/* Session expiry countdown warning. At expiry, the hook switches to a 3s
          Toast (see useSessionHeartbeat.handleExpired), so this banner never
          sits forever in a "0s" state. */}
      {showExpiryWarning && secondsLeft > 0 && (
        <View style={styles.warningBannerWrap} pointerEvents="box-none">
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>Session expires in {secondsLeft}s</Text>
            <TouchableOpacity style={styles.extendBtn} onPress={extendSession}>
              <Text style={styles.extendBtnText}>Extend</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  loader: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background},
  warningBannerWrap: {
    position:       'absolute',
    bottom:         90,
    left:           0,
    right:          0,
    paddingHorizontal: Spacing.outer,
  },
  warningBanner: {
    backgroundColor:  Colors.textDark,
    borderRadius:     Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical:  Spacing.sm + 2,
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    gap:              Spacing.sm,
    ...Shadow.card,
  },
  warningText: {
    fontFamily: 'Inter-SemiBold',
    fontSize:   13,
    color:      Colors.white,
    flex:       1,
  },
  extendBtn: {
    backgroundColor: Colors.white,
    borderRadius:    Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  extendBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize:   12,
    color:      Colors.textDark,
  },
});
