import {NavigatorScreenParams} from '@react-navigation/native';
import {MenuItem} from '../services/api';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  OTP: {phone: string; name?: string; mode: 'login' | 'signup'; deviceId?: string};
  QRScanner: {context: 'auth'};
};

export type MainTabParamList = {
  Menu: undefined;
  Cart: undefined;
  Orders: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList> | undefined;
  ItemDetail: {item: MenuItem};
  OrderDetail: {orderId: string};
  Rewards: undefined;
  OrderTracking: {
    orderId: string;
    initialStatus: string;
    tableNumber: string;
    totalAmount: string;
  };
  OrderSuccess: {
    orderId: string;
    tableNumber: string;
    totalAmount: string;
  };
  Search: undefined;
  HelpSupport: undefined;
  SessionNamePrompt: {tableId: string; tableNumber: string; returnTo?: keyof MainTabParamList};
  CubeTracking: {qrCodeToken: string};
  QRScanner: {context: 'main' | 'rescan'};
};
