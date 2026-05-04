import {MenuItem} from '../services/api';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  OTP: {phone: string; name?: string; mode: 'login' | 'signup'; deviceId?: string};
};

export type MainTabParamList = {
  Menu: undefined;
  Cart: undefined;
  Orders: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  ItemDetail: {item: MenuItem};
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
  SessionNamePrompt: {tableId: string; tableNumber: string};
  CubeTracking: {qrCodeToken: string};
};
