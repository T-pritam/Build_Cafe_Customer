import messaging from '@react-native-firebase/messaging';
import {Platform, PermissionsAndroid} from 'react-native';

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }
  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

export async function getFCMToken(): Promise<string | null> {
  try {
    if (!messaging().isDeviceRegisteredForRemoteMessages) {
      await messaging().registerDeviceForRemoteMessages();
    }
    const token = await messaging().getToken();
    return token;
  } catch {
    return null;
  }
}

export function onForegroundMessage(
  handler: (msg: any) => void,
): () => void {
  return messaging().onMessage(handler);
}

export function setBackgroundMessageHandler() {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Background FCM:', remoteMessage);
  });
}
