import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  StatusBar,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import {
  launchImageLibrary,
  launchCamera,
  ImagePickerResponse,
} from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import {Colors, Spacing, Typography, Radius, Shadow} from '../../theme';
import {useAuthStore} from '../../store/authStore';
import {requestNotificationPermission, getFCMToken} from '../../services/fcm';

const MENU_ITEMS = [
  {icon: 'receipt-text-outline', label: 'Order History', badge: null},
  {icon: 'bell-outline', label: 'Notifications', badge: '3'},
  {icon: 'help-circle-outline', label: 'Help & Support', badge: null},
  {icon: 'shield-account-outline', label: 'Privacy Policy', badge: null},
  {icon: 'information-outline', label: 'About Build Cafe', badge: null},
];

export const ProfileScreen: React.FC = () => {
  const {user, setProfilePic, setFcmToken, logout} = useAuthStore();
  const [notifEnabled, setNotifEnabled] = useState(false);

  const handleProfilePicAction = () => {
    Alert.alert('Profile Photo', 'Choose a source', [
      {text: 'Camera', onPress: openCamera},
      {text: 'Photo Library', onPress: openLibrary},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleImageResult = async (result: ImagePickerResponse) => {
    if (result.didCancel || result.errorCode) return;
    const uri = result.assets?.[0]?.uri;
    if (uri) {
      setProfilePic(uri);
      Toast.show({type: 'success', text1: 'Profile photo updated'});
      // Request notification permission after profile pic selection
      const granted = await requestNotificationPermission();
      if (granted) {
        const token = await getFCMToken();
        if (token) {
          setFcmToken(token);
          setNotifEnabled(true);
          Toast.show({
            type: 'success',
            text1: 'Notifications enabled',
            text2: 'You\'ll receive order updates',
          });
        }
      }
    }
  };

  const openLibrary = () => {
    launchImageLibrary(
      {mediaType: 'photo', quality: 0.8, selectionLimit: 1},
      handleImageResult,
    );
  };

  const openCamera = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Toast.show({type: 'error', text1: 'Camera permission denied'});
        return;
      }
    }
    launchCamera({mediaType: 'photo', quality: 0.8}, handleImageResult);
  };

  const handleNotificationToggle = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      const token = await getFCMToken();
      if (token) {
        setFcmToken(token);
        setNotifEnabled(true);
        Toast.show({type: 'success', text1: 'Notifications enabled'});
      }
    } else {
      Toast.show({type: 'error', text1: 'Permission denied in settings'});
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Sign Out', style: 'destructive', onPress: logout},
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Avatar section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handleProfilePicAction}>
            {user?.profilePic ? (
              <Image
                source={{uri: user.profilePic}}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name="account" size={40} color={Colors.border} />
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Icon name="camera" size={14} color={Colors.white} />
            </View>
          </TouchableOpacity>

          <Text style={styles.profileName}>{user?.name || 'Guest'}</Text>
          <Text style={styles.profileMobile}>+91 {user?.mobile}</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹2,840</Text>
            <Text style={styles.statLabel}>Spent</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>Table 07</Text>
            <Text style={styles.statLabel}>Current</Text>
          </View>
        </View>

        {/* Notifications row */}
        <View style={styles.notifCard}>
          <View style={styles.notifLeft}>
            <Icon
              name="bell-outline"
              size={22}
              color={notifEnabled ? Colors.accent : Colors.textMuted}
            />
            <View>
              <Text style={styles.notifTitle}>Push Notifications</Text>
              <Text style={styles.notifSubtitle}>
                {notifEnabled
                  ? 'Order updates enabled'
                  : 'Enable for order updates'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.notifToggle,
              notifEnabled && styles.notifToggleActive,
            ]}
            onPress={handleNotificationToggle}>
            <View
              style={[
                styles.notifThumb,
                notifEnabled && styles.notifThumbActive,
              ]}
            />
          </TouchableOpacity>
        </View>

        {/* Menu items */}
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.menuRow,
                idx < MENU_ITEMS.length - 1 && styles.menuRowBorder,
              ]}>
              <Icon name={item.icon} size={22} color={Colors.textMuted} />
              <Text style={styles.menuRowLabel}>{item.label}</Text>
              {item.badge ? (
                <View style={styles.menuBadge}>
                  <Text style={styles.menuBadgeText}>{item.badge}</Text>
                </View>
              ) : null}
              <Icon name="chevron-right" size={18} color={Colors.border} />
            </TouchableOpacity>
          ))}
        </View>

        {/* FCM token (debug) */}
        {user?.fcmToken ? (
          <View style={styles.debugCard}>
            <Text style={styles.debugLabel}>FCM Token (last 20 chars)</Text>
            <Text style={styles.debugValue}>
              …{user.fcmToken.slice(-20)}
            </Text>
          </View>
        ) : null}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Icon name="logout" size={18} color={Colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Build Cafe v1.0.0</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  topBar: {
    paddingHorizontal: Spacing.outer,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topBarTitle: {
    fontFamily: 'Fraunces-SemiBold',
    fontSize: 24,
    color: Colors.textDark,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.inputBg,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  profileName: {
    fontFamily: 'Fraunces-SemiBold',
    fontSize: 24,
    color: Colors.textDark,
  },
  profileMobile: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.outer,
    padding: Spacing.md,
    ...Shadow.card,
    borderWidth: 1,
    borderColor: Colors.border + '30',
  },
  statItem: {flex: 1, alignItems: 'center', gap: 4},
  statValue: {
    fontFamily: 'Fraunces-Bold',
    fontSize: 20,
    color: Colors.textDark,
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.outer,
    padding: Spacing.md,
    ...Shadow.card,
    borderWidth: 1,
    borderColor: Colors.border + '30',
  },
  notifLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  notifTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.textDark,
  },
  notifSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  notifToggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  notifToggleActive: {backgroundColor: Colors.accent},
  notifThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  notifThumbActive: {alignSelf: 'flex-end'},
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.outer,
    ...Shadow.card,
    borderWidth: 1,
    borderColor: Colors.border + '30',
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '40',
  },
  menuRowLabel: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.textDark,
  },
  menuBadge: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    color: Colors.white,
  },
  debugCard: {
    marginHorizontal: Spacing.outer,
    padding: Spacing.md,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    gap: 4,
  },
  debugLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  debugValue: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.textDark,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.outer,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error + '40',
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
  },
  logoutText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.error,
  },
  version: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.border,
    textAlign: 'center',
    paddingBottom: Spacing.md,
  },
});
