import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {Colors, Spacing, Typography, Radius} from '../../theme';
import {OTPInput} from '../../components/OTPInput';
import {Button} from '../../components/Button';
import {useAuthStore} from '../../store/authStore';
import {AuthStackParamList} from '../../navigation/types';
import notifee, {AndroidImportance, AndroidCategory} from '@notifee/react-native';
import {onForegroundMessage} from '../../services/fcm';
import {authAPI} from '../../services/api';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'OTP'>;
  route: RouteProp<AuthStackParamList, 'OTP'>;
};

export const OTPScreen: React.FC<Props> = ({navigation, route}) => {
  const insets = useSafeAreaInsets();
  const {phone, name, mode, deviceId} = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const setAuth = useAuthStore(s => s.setAuth);

  useEffect(() => {
    startTimer();
    sendOTP();

    const unsubscribe = onForegroundMessage(msg => {
      const incomingOtp = msg?.data?.otp;
      if (incomingOtp && String(incomingOtp).length === 6) {
        setOtp(String(incomingOtp));
        notifee.displayNotification({
          title: 'Build Cafe — OTP',
          body: `Your one-time password is ${incomingOtp}. Valid for 5 minutes.`,
          android: {
            channelId: 'otp',
            importance: AndroidImportance.HIGH,
            category: AndroidCategory.MESSAGE,
            pressAction: {id: 'default'},
          },
        });
      }
    });

    return () => {
      clearTimer();
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTimer = () => {
    setResendTimer(30);
    timerRef.current = setInterval(() => {
      setResendTimer(t => {
        if (t <= 1) {clearTimer(); return 0;}
        return t - 1;
      });
    }, 1000);
  };

  const clearTimer = () => {
    if (timerRef.current) {clearInterval(timerRef.current);}
  };

  const sendOTP = async () => {
    try {
      const res = await authAPI.sendOTP(phone, deviceId);
      // Dev fallback: auto-fill OTP returned in response body
      if (res.data._devOtp) {
        setOtp(res.data._devOtp);
      }
    } catch (e: any) {
      console.error('[OTP] sendOTP error:', e?.message);
      Toast.show({type: 'error', text1: 'Could not send OTP', text2: e?.message});
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Toast.show({type: 'error', text1: 'Enter the 6-digit OTP'});
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.verifyOTP(phone, otp, mode === 'signup' ? name : undefined);
      const {accessToken, refreshToken, user} = res.data;

      setAuth(
        {
          id:                  user.id,
          phone:               user.phone,
          name:                mode === 'signup' && name ? name : user.name,
          email:               user.email,
          role:                user.role as any,
          onboardingCompleted: user.onboardingCompleted,
          rewardPointsBalance: user.rewardPointsBalance,
        },
        accessToken,
        refreshToken,
      );

      Toast.show({type: 'success', text1: 'Welcome to Build Cafe!'});
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Verification failed',
        text2: e?.message ?? 'Check your OTP and try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) {return;}
    await sendOTP();
    startTimer();
    Toast.show({type: 'info', text1: 'OTP resent'});
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} translucent={false} />
      <ScrollView
        contentContainerStyle={[styles.container, {paddingTop: insets.top + Spacing.lg}]}
        keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <Text style={styles.wordmark}>BUILD CAFE</Text>

        <View style={styles.headlineBlock}>
          <Text style={styles.headline}>Verify your{'\n'}number.</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit OTP to{' '}
            <Text style={styles.mobileHighlight}>+91 {phone}</Text>
          </Text>
        </View>

        <View style={styles.otpContainer}>
          <OTPInput length={6} value={otp} onChange={setOtp} />
        </View>

        <View style={styles.spacer} />

        <Button
          label={mode === 'signup' ? 'Create Account' : 'Sign In'}
          onPress={handleVerify}
          loading={loading}
          disabled={otp.length < 6}
        />

        <TouchableOpacity
          style={styles.resendRow}
          onPress={handleResend}
          disabled={resendTimer > 0}>
          <Text
            style={[
              styles.resendText,
              resendTimer > 0 && styles.resendDisabled,
            ]}>
            {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: Colors.background},
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.outer,
    paddingBottom: Spacing.xl,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  backIcon: {fontSize: 22, color: Colors.textDark},
  wordmark: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.xl,
  },
  headlineBlock: {marginBottom: Spacing.xl},
  headline: {
    fontFamily: 'Fraunces-Bold',
    fontSize: 36,
    color: Colors.textDark,
    lineHeight: 42,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.textMedium,
    lineHeight: 22,
  },
  mobileHighlight: {fontFamily: 'Inter-SemiBold', color: Colors.textDark},
  otpContainer: {marginBottom: Spacing.md},
  spacer: {flex: 1, minHeight: 40},
  resendRow: {alignItems: 'center', paddingVertical: Spacing.md},
  resendText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: Colors.accent,
    textDecorationLine: 'underline',
  },
  resendDisabled: {color: Colors.textMuted, textDecorationLine: 'none'},
});
