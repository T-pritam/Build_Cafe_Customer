export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  OTP: {mobile: string; name?: string; mode: 'login' | 'signup'};
};

export type MainTabParamList = {
  Menu: undefined;
  Cart: undefined;
  Orders: undefined;
  Profile: undefined;
};
