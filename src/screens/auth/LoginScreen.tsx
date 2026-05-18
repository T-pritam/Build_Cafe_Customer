import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors, Spacing} from '../../theme';
import {Input} from '../../components/Input';
import {Button} from '../../components/Button';
import {AuthStackParamList} from '../../navigation/types';
import {useCartStore} from '../../store/cartStore';
import {useAuthStore} from '../../store/authStore';


type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

export const LoginScreen: React.FC<Props> = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const [mobile, setMobile] = useState('');
  const pendingScan = useCartStore(s => s.pendingScan);
  const deviceId = useAuthStore(s => s.deviceId);

  const handleSendOTP = async () => {
    if (mobile.length !== 10) {
      Toast.show({type: 'error', text1: 'Enter a valid 10-digit mobile number'});
      return;
    }
    navigation.navigate('OTP', {phone: mobile, mode: 'login', deviceId: deviceId ?? undefined});
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} translucent={false} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.container, {paddingTop: insets.top + Spacing.lg}]}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.wordmark}>BUILD CAFE</Text>

        {/* Table badge / scan button */}
        {pendingScan ? (
          <TouchableOpacity
            style={styles.tableBadge}
            onPress={() => navigation.navigate('QRScanner', {context: 'auth'})}
            activeOpacity={0.75}>
            <Icon name="qrcode-scan" size={14} color={Colors.textMuted} style={styles.scanIcon} />
            <Text style={styles.tableLabel}>TABLE</Text>
            <Text style={styles.tableNumber}>{pendingScan.tableNumber}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => navigation.navigate('QRScanner', {context: 'auth'})}
            activeOpacity={0.75}>
            <Icon name="qrcode-scan" size={18} color={Colors.accent} />
            <Text style={styles.scanButtonText}>Scan table QR</Text>
          </TouchableOpacity>
        )}

        <View style={styles.headlineBlock}>
          <Text style={styles.headline}>Welcome back.</Text>
          <Text style={styles.subtitle}>
            {pendingScan
              ? `Sign in to start ordering at Table ${pendingScan.tableNumber}.`
              : 'Sign in with your mobile number to continue your order.'}
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="MOBILE NUMBER"
            prefix="+91"
            placeholder="98765 43210"
            value={mobile}
            onChangeText={t => setMobile(t.replace(/\D/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            hint="We'll send you a one-time password to verify."
          />

          <View style={styles.spacer} />

          <Button
            label="Send OTP"
            onPress={handleSendOTP}
            disabled={mobile.length < 10}
          />

          <Text style={styles.terms}>
            By continuing, you agree to our Terms &amp; Privacy Policy
          </Text>

          <TouchableOpacity
            style={styles.switchRow}
            onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.switchText}>
              New here?{' '}
              <Text style={styles.switchLink}>Create an account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: Colors.background},
  scroll: {flex: 1},
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.outer,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.lg,
  },
  tableBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    shadowColor: '#1C1410',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  scanIcon: {
    marginBottom: 2,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accentLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: Spacing.lg,
  },
  scanButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.accent,
  },
  tableLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  tableNumber: {
    fontFamily: 'Fraunces-Bold',
    fontSize: 44,
    color: Colors.textDark,
    lineHeight: 48,
  },
  headlineBlock: {
    alignSelf: 'stretch',
    marginBottom: Spacing.xl,
  },
  headline: {
    fontFamily: 'Fraunces-Bold',
    fontSize: 36,
    color: Colors.textDark,
    lineHeight: 40,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.textMedium,
    lineHeight: 22,
  },
  form: {
    alignSelf: 'stretch',
    gap: Spacing.md,
    flex: 1,
  },
  spacer: {flex: 1, minHeight: 40},
  terms: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  switchRow: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  switchText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  switchLink: {
    color: Colors.accent,
    fontFamily: 'Inter-SemiBold',
  },
});
