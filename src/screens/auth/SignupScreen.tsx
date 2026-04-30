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
import Toast from 'react-native-toast-message';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors, Spacing, Typography, Radius} from '../../theme';
import {Input} from '../../components/Input';
import {Button} from '../../components/Button';
import {AuthStackParamList} from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Signup'>;
};

export const SignupScreen: React.FC<Props> = ({navigation}) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!name.trim()) {
      Toast.show({type: 'error', text1: 'Please enter your name'});
      return;
    }
    if (mobile.length !== 10) {
      Toast.show({type: 'error', text1: 'Enter a valid 10-digit mobile number'});
      return;
    }
    setLoading(true);
    await new Promise<void>(r => setTimeout(r, 1000));
    setLoading(false);
    navigation.navigate('OTP', {mobile, name, mode: 'signup'});
  };

  const isValid = name.trim().length > 0 && mobile.length === 10;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        {/* Brand wordmark */}
        <Text style={styles.wordmark}>BUILD CAFE</Text>

        {/* Table badge */}
        <View style={styles.tableBadge}>
          <Text style={styles.tableLabel}>TABLE</Text>
          <Text style={styles.tableNumber}>07</Text>
        </View>

        {/* Headline */}
        <View style={styles.headlineBlock}>
          <Text style={styles.headline}>A warm welcome.</Text>
          <Text style={styles.subtitle}>
            Tell us your name so we can personalise your visit and reach you
            if anything's needed for your order.
          </Text>
        </View>

        {/* Form */}
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

          <View style={styles.spacer} />

          <Button
            label="Send OTP"
            onPress={handleSendOTP}
            loading={loading}
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
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
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
    marginBottom: 60,
    shadowColor: '#1C1410',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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
    ...Typography.metaXS,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  switchRow: {alignItems: 'center', paddingVertical: Spacing.sm},
  switchText: {
    ...Typography.metaXS,
    fontFamily: 'Inter-Regular',
    color: Colors.textMuted,
  },
  switchLink: {color: Colors.accent, fontFamily: 'Inter-SemiBold'},
});
