import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {useAuthStore} from '../store/authStore';
import {AuthNavigator} from './AuthNavigator';
import {MainNavigator} from './MainNavigator';
import {
  requestNotificationPermission,
  getFCMToken,
  onForegroundMessage,
  setBackgroundMessageHandler,
} from '../services/fcm';
import Toast from 'react-native-toast-message';

export const RootNavigator: React.FC = () => {
  const {isAuthenticated, setFcmToken} = useAuthStore();

  useEffect(() => {
    // Handle background FCM
    setBackgroundMessageHandler();

    // Request permission and get token on app launch
    (async () => {
      const granted = await requestNotificationPermission();
      if (granted) {
        const token = await getFCMToken();
        if (token) {
          console.log('FCM Token:', token);
          setFcmToken(token);
        }
      }
    })();

    // Foreground message handler
    const unsubscribe = onForegroundMessage(msg => {
      const {notification} = msg;
      if (notification?.title) {
        Toast.show({
          type: 'info',
          text1: notification.title,
          text2: notification.body,
        });
      }
    });

    return unsubscribe;
  }, []);

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};
