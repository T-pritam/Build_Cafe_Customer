import React, {useEffect} from 'react';
import Config from 'react-native-config';
import notifee, {AndroidImportance} from '@notifee/react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {RootNavigator} from './src/navigation/RootNavigator';
import {requestNotificationPermission, getFCMToken, getDeviceId} from './src/services/fcm';

function App(): React.JSX.Element {
  useEffect(() => {
    console.log('[ENV] API_BASE_URL:', Config.API_BASE_URL);
    console.log('[ENV] SUPABASE_URL:', Config.SUPABASE_URL);
    console.log('[ENV] SUPABASE_ANON_KEY:', Config.SUPABASE_ANON_KEY);
    console.log('[ENV] RAZORPAY_KEY_ID:', Config.RAZORPAY_KEY_ID);
    notifee.createChannel({ id: 'otp', name: 'OTP Alerts', importance: AndroidImportance.HIGH });
    requestNotificationPermission().then(granted => {
      if (granted) {
        Promise.all([getFCMToken(), getDeviceId()]).then(([token, deviceId]) => {
          console.log('[FCM] Pre-warmed token:', token ? 'ok' : 'null', '| deviceId:', deviceId);
        });
      }
    });
  }, []);
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <RootNavigator />
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
