import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  StatusBar,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import {Colors, Spacing, Radius, Shadow} from '../../theme';
import {useAuthStore} from '../../store/authStore';
import {useCartStore} from '../../store/cartStore';
import {sessionsAPI} from '../../services/api';
import {getOrCreateFingerprint} from '../../utils/fingerprint';
import type {MainStackParamList} from '../../navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type RouteT = RouteProp<MainStackParamList, 'SessionNamePrompt'>;

interface ResumeInfo {
  sessionId: string;
  displayName: string;
  tableNumber: number;
}

export const SessionNamePromptScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const {tableId, tableNumber, returnTo} = route.params;

  const {user} = useAuthStore();
  const {setSession} = useCartStore();

  const [name, setName] = useState((user?.name ?? '').slice(0, 20));
  const [loading, setLoading] = useState(false);
  const [resumeInfo, setResumeInfo] = useState<ResumeInfo | null>(null);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // If already logged in with a name, skip the prompt entirely
    if (user?.name && user.name.trim().length >= 2) {
      joinTable(user.name.trim());
      return;
    }
    setTimeout(() => inputRef.current?.focus(), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const joinTable = async (overrideName?: string) => {
    const displayName = (overrideName ?? name).trim();
    if (displayName.length < 2) {
      Toast.show({type: 'error', text1: 'Name too short', text2: 'At least 2 characters required'});
      return;
    }

    setLoading(true);
    try {
      const fp = await getOrCreateFingerprint();
      const res = await sessionsAPI.create({tableId, displayName, deviceFingerprint: fp});
      const {id, tableNumber: tableNum, displayName: confirmedName, resumed} = res.data;

      if (resumed) {
        setResumeInfo({sessionId: id, displayName: confirmedName, tableNumber: tableNum});
        return;
      }

      if (confirmedName !== displayName) {
        Toast.show({
          type: 'info',
          text1: `Name taken — joining as ${confirmedName}`,
        });
      }

      setSession(tableId, tableNum, id, confirmedName);
      navigation.replace('Tabs', returnTo ? {screen: returnTo} : undefined);
    } catch (e: any) {
      Toast.show({type: 'error', text1: 'Could not join table', text2: e?.message ?? 'Try again'});
    } finally {
      setLoading(false);
    }
  };

  const confirmResume = () => {
    if (!resumeInfo) {return;}
    setSession(tableId, resumeInfo.tableNumber, resumeInfo.sessionId, resumeInfo.displayName);
    setResumeInfo(null);
    navigation.replace('Tabs');
  };

  const startFresh = async () => {
    if (!resumeInfo) {return;}
    try {
      await sessionsAPI.terminate(resumeInfo.sessionId);
    } catch {
      // best-effort
    }
    setResumeInfo(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} translucent={false} />

      <View style={styles.handle} />

      <Text style={styles.title}>Join Table {tableNumber}</Text>
      <Text style={styles.subtitle}>
        What should we call you at this table?
      </Text>

      <TextInput
        ref={inputRef}
        style={styles.input}
        value={name}
        onChangeText={t => setName(t.slice(0, 20))}
        placeholder="Your name"
        placeholderTextColor={Colors.textMuted}
        maxLength={20}
        returnKeyType="done"
        onSubmitEditing={() => joinTable()}
        editable={!loading}
      />
      <Text style={styles.charCount}>{name.trim().length}/20</Text>

      <TouchableOpacity
        style={[styles.joinBtn, (loading || name.trim().length < 2) && styles.joinBtnDisabled]}
        onPress={() => joinTable()}
        disabled={loading || name.trim().length < 2}>
        {loading ? (
          <ActivityIndicator color={Colors.white} size="small" />
        ) : (
          <Text style={styles.joinBtnText}>Join Table</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>

      {/* Resume modal — shown when server returns resumed: true */}
      <Modal
        visible={resumeInfo !== null}
        transparent
        animationType="fade"
        onRequestClose={startFresh}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Welcome back, {resumeInfo?.displayName}!
            </Text>
            <Text style={styles.modalSubtitle}>
              You have an existing session at Table {tableNumber}. Continue where you left off?
            </Text>
            <TouchableOpacity style={styles.continueBtn} onPress={confirmResume}>
              <Text style={styles.continueBtnText}>Continue Session</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.freshBtn} onPress={startFresh}>
              <Text style={styles.freshBtnText}>Start Fresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.outer,
    paddingTop: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: 'Fraunces-SemiBold',
    fontSize: 28,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: 'Inter-Regular',
    fontSize: 18,
    color: Colors.textDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  charCount: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  joinBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadow.button,
  },
  joinBtnDisabled: {
    opacity: 0.5,
  },
  joinBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.white,
  },
  cancelBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.outer,
  },
  modalCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 360,
    gap: Spacing.md,
    ...Shadow.card,
  },
  modalTitle: {
    fontFamily: 'Fraunces-SemiBold',
    fontSize: 22,
    color: Colors.textDark,
  },
  modalSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  continueBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  continueBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.white,
  },
  freshBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  freshBtnText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.textMuted,
  },
});
