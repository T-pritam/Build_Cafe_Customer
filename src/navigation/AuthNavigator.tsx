import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AuthStackParamList} from './types';
import {LoginScreen} from '../screens/auth/LoginScreen';
import {SignupScreen} from '../screens/auth/SignupScreen';
import {OTPScreen} from '../screens/auth/OTPScreen';
import {QRScannerScreen} from '../screens/shared/QRScannerScreen';
import {useCartStore} from '../store/cartStore';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  const pendingScan = useCartStore(s => s.pendingScan);
  return (
    <Stack.Navigator
      screenOptions={{headerShown: false}}
      initialRouteName={pendingScan ? 'Signup' : 'Login'}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="OTP" component={OTPScreen} />
      <Stack.Screen
        name="QRScanner"
        component={QRScannerScreen}
        options={{presentation: 'fullScreenModal'}}
      />
    </Stack.Navigator>
  );
};
