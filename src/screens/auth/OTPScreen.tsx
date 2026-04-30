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
import Toast from 'react-native-toast-message';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {Colors, Spacing, Typography, Radius} from '../../theme';
import {OTPInput} from '../../components/OTPInput';
import {Button} from '../../components/Button';
import {useAuthStore} from '../../store/authStore';
import {AuthStackParamList} from '../../navigation/types';
import {getFCMToken} from '../../services/fcm';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'OTP'>;
  route: RouteProp<AuthStackParamList, 'OTP'>;
};

export const OTPScreen: React.FC<Props> = ({navigation, route}) => {
  const {mobile, name, mode} = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const setUser = useAuthStore(s => s.setUser);
  const setFcmToken = useAuthStore(s => s.setFcmToken);

  useEffect(() => {
    startTimer();
    return () => clearTimer();
  }, []);

  const startTimer = () => {
    setResendTimer(30);
    timerRef.current = setInterval(() => {
      setResendTimer(t => {
        if (t <= 1) {
          clearTimer();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Toast.show({type: 'error', text1: 'Enter the 6-digit OTP'});
      return;
    }
    setLoading(true);
    // Simulate API call - dummy OTP is 123456
    await new Promise<void>(r => setTimeout(r, 1200));
    if (otp !== '123456') {
      setLoading(false);
      Toast.show({type: 'error', text1: 'Incorrect OTP. Try 123456'});
      return;
    }
    // Get FCM token and store it
    const token = await getFCMToken();
    const user = {
      id: 'usr_' + Date.now(),
      name: name || 'Guest',
      mobile,
      fcmToken: token || undefined,
    };
    setUser(user);
    if (token) setFcmToken(token);
    setLoading(false);
    Toast.show({type: 'success', text1: 'Welcome to Build Cafe!'});
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    Toast.show({type: 'info', text1: 'OTP resent'});
    startTimer();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        {/* Brand wordmark */}
        <Text style={styles.wordmark}>BUILD CAFE</Text>

        {/* Headline */}
        <View style={styles.headlineBlock}>
          <Text style={styles.headline}>Verify your{'\n'}number.</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit OTP to{' '}
            <Text style={styles.mobileHighlight}>+91 {mobile}</Text>
          </Text>
        </View>

        {/* OTP input */}
        <View style={styles.otpContainer}>
          <OTPInput length={6} value={otp} onChange={setOtp} />
        </View>

        {/* Hint */}
        <Text style={styles.hint}>
          For demo: use <Text style={styles.hintCode}>123456</Text>
        </Text>

        <View style={styles.spacer} />

        <Button
          label={mode === 'signup' ? 'Create Account' : 'Sign In'}
          onPress={handleVerify}
          loading={loading}
          disabled={otp.length < 6}
        />

        {/* Resend */}
        <TouchableOpacity
          style={styles.resendRow}
          onPress={handleResend}
          disabled={resendTimer > 0}>
          <Text
            style={[
              styles.resendText,
              resendTimer > 0 && styles.resendDisabled,
            ]}>
            {resendTimer > 0
              ? `Resend OTP in ${resendTimer}s`
              : 'Resend OTP'}
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
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  backIcon: {
    fontSize: 22,
    color: Colors.textDark,
  },
  wordmark: {
    ...Typography.metaXS,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textMuted,
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.xl,
  },
  headlineBlock: {
    marginBottom: Spacing.xl,
  },
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
  mobileHighlight: {
    fontFamily: 'Inter-SemiBold',
    color: Colors.textDark,
  },
  otpContainer: {
    marginBottom: Spacing.md,
  },
  hint: {
    ...Typography.metaXS,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    fontStyle: 'italic',
  },
  hintCode: {
    fontFamily: 'Inter-SemiBold',
    color: Colors.accent,
    fontStyle: 'normal',
  },
  spacer: {flex: 1, minHeight: 40},
  resendRow: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  resendText: {
    ...Typography.metaXS,
    fontFamily: 'Inter-SemiBold',
    color: Colors.accent,
    textDecorationLine: 'underline',
  },
  resendDisabled: {
    color: Colors.textMuted,
    textDecorationLine: 'none',
  },
});
