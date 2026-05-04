import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const KEY = '@buildcafe_device_fp';

export async function getOrCreateFingerprint(): Promise<string> {
  const stored = await AsyncStorage.getItem(KEY);
  if (stored) return stored;
  const fp = `fp_${Platform.OS}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(KEY, fp);
  return fp;
}
