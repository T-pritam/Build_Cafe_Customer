import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors, Spacing, Typography} from '../../theme';
import {Input} from '../../components/Input';
import {Button} from '../../components/Button';
import {AuthStackParamList} from '../../navigation/types';
import {useCartStore} from '../../store/cartStore';
import {useAuthStore} from '../../store/authStore';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Signup'>;
};

export const SignupScreen: React.FC<Props> = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const pendingScan = useCartStore(s => s.pendingScan);
  const deviceId = useAuthStore(s => s.deviceId);

  const tableDisplay = pendingScan?.tableNumber ?? '--';

  const handleSendOTP = () => {
    if (!name.trim()) {
      Toast.show({type: 'error', text1: 'Please enter your name'});
      return;
    }
    if (mobile.length !== 10) {
      Toast.show({type: 'error', text1: 'Enter a valid 10-digit mobile number'});
      return;
    }
    navigation.navigate('OTP', {phone: mobile, name, mode: 'signup', deviceId: deviceId ?? undefined});
  };

  const isValid = name.trim().length > 0 && mobile.length === 10;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} translucent={false} />
      <View style={[styles.container, {paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.lg}]}>
        {/* Top content */}
        <View style={styles.topContent}>
          <Text style={styles.wordmark}>BUILD CAFE</Text>

          {/* Table badge — tap to scan QR */}
          <TouchableOpacity
            style={styles.tableBadge}
            onPress={() => navigation.navigate('QRScanner', {context: 'auth'})}
            activeOpacity={0.75}>
            <Icon name="qrcode-scan" size={14} color={Colors.textMuted} style={styles.scanIcon} />
            <Text style={styles.tableLabel}>TABLE</Text>
            <Text style={styles.tableNumber}>{tableDisplay}</Text>
          </TouchableOpacity>

          {/* Headline */}
          <View style={styles.headlineBlock}>
            <Text style={styles.headline}>A warm welcome.</Text>
            <Text style={styles.subtitle}>
              Tell us your name so we can personalise your visit and reach you
              if anything's needed for your order.
            </Text>
          </View>
        </View>

        {/* Form anchored to bottom */}
        <View style={styles.form}>
          <Input
            label="YOUR NAME"
            placeholder="e.g. Aarav Mehra"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Input
            label="MOBILE NUMBER"
            prefix="+91"
            placeholder="98765 43210"
            value={mobile}
            onChangeText={t => setMobile(t.replace(/\D/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            hint="We'll only use this for order updates and refunds. Promise."
          />

          <Button
            label="Start Ordering"
            onPress={handleSendOTP}
            disabled={!isValid}
          />

          <Text style={styles.terms}>
            By continuing, you agree to our Terms &amp; Privacy Policy
          </Text>

          <TouchableOpacity
            style={styles.switchRow}
            onPress={() => navigation.navigate('Login')}>
            <Text style={styles.switchText}>
              Already have an account?{' '}
              <Text style={styles.switchLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: Colors.background},
  container: {
    flex: 1,
    paddingHorizontal: Spacing.outer,
    justifyContent: 'space-between',
  },
  topContent: {
    alignItems: 'center',
  },
  wordmark: {
    ...Typography.metaXS,
    fontFamily: 'Inter-SemiBold',
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
  },
  headline: {
    fontFamily: 'Fraunces-Bold',
    fontSize: 32,
    color: Colors.textDark,
    lineHeight: 38,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.textMedium,
    lineHeight: 20,
  },
  form: {
    alignSelf: 'stretch',
    gap: Spacing.md,
  },
  terms: {
    ...Typography.metaXS,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  switchRow: {alignItems: 'center', paddingVertical: Spacing.sm},
  switchText: {
    ...Typography.metaXS,
    fontFamily: 'Inter-Regular',
    color: Colors.textMuted,
  },
  switchLink: {color: Colors.accent, fontFamily: 'Inter-SemiBold'},
});
