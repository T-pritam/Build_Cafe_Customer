import React, {useEffect, useRef, useCallback} from 'react';
import {Linking, View, ActivityIndicator, Platform, Modal, Text, StyleSheet, TouchableOpacity} from 'react-native';
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
} from '../services/fcm';
import {tablesAPI, fcmTokensAPI} from '../services/api';
import {useSessionHeartbeat} from '../hooks/useSessionHeartbeat';
import Toast from 'react-native-toast-message';
import {Colors, Spacing, Radius, Shadow} from '../theme';
import {getOrCreateFingerprint} from '../utils/fingerprint';
import {PushRequestOverlay} from '../components/PushRequestOverlay';

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
  | {kind: 'unknown'};

function parseDeepLink(url: string): DeepLinkResult {
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
  const {pendingScan, setPendingScan, pendingCubeScan, setPendingCubeScan, sessionExpired, setSessionExpired} = useCartStore();
  const fpRef = useRef<string>('');
  const {showExpiryWarning, secondsLeft} = useSessionHeartbeat();

  useEffect(() => {
    getOrCreateFingerprint().then(fp => {fpRef.current = fp;});
  }, []);

  const handleTableDeepLink = useCallback(async (tableId: string) => {
    try {
      const res = await tablesAPI.scan(tableId);
      const {tableNumber} = res.data;
      const tableNum = String(tableNumber).padStart(2, '0');

      if (!isAuthenticated) {
        setPendingScan({tableId, tableNumber: tableNum});
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

  const handleDeepLink = useCallback((url: string) => {
    const link = parseDeepLink(url);
    if (link.kind === 'table') {
      handleTableDeepLink(link.tableId);
    } else if (link.kind === 'cube') {
      handleCubeDeepLink(link.qrCodeToken);
    }
  }, [handleTableDeepLink, handleCubeDeepLink]);

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

      {/* Session expired modal */}
      <Modal
        visible={sessionExpired}
        transparent
        animationType="fade"
        onRequestClose={() => setSessionExpired(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Table session expired</Text>
            <Text style={styles.modalSubtitle}>
              Your table session timed out due to inactivity. Scan the QR code on your table to continue ordering.
            </Text>
            <TouchableOpacity style={styles.dismissBtn} onPress={() => setSessionExpired(false)}>
              <Text style={styles.dismissBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Session expiry warning banner */}
      <Modal
        visible={showExpiryWarning && !sessionExpired}
        transparent
        animationType="slide"
        onRequestClose={() => {}}>
        <View style={styles.warningBannerWrap}>
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              {secondsLeft > 0
                ? `Table session expires in ${secondsLeft}s — scan QR to stay`
                : 'Table session expiring — scan QR to continue ordering'}
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  loader: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.outer,
  },
  modalCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 360,
    gap: Spacing.md,
    ...Shadow.card,
  },
  modalTitle: {
    fontFamily: 'Fraunces-SemiBold',
    fontSize: 20,
    color: Colors.textDark,
  },
  modalSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  dismissBtn: {
    backgroundColor: Colors.textDark,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  dismissBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.white,
  },
  warningBannerWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 90,
    pointerEvents: 'none',
  },
  warningBanner: {
    marginHorizontal: Spacing.outer,
    backgroundColor: Colors.textDark,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  warningText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.white,
    textAlign: 'center',
  },
});
