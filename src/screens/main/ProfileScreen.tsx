import React, {useState, useEffect} from 'react';
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
  Linking,
  ActivityIndicator,
} from 'react-native';
import {
  launchImageLibrary,
  launchCamera,
  ImagePickerResponse,
} from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors, Spacing, Typography, Radius, Shadow} from '../../theme';
import {MainStackParamList} from '../../navigation/types';
import {useAuthStore} from '../../store/authStore';
import {requestNotificationPermission, getFCMToken, getDeviceId} from '../../services/fcm';
import {fcmTokensAPI, ordersAPI, authAPI, uploadAPI} from '../../services/api';

const APP_PLATFORM: 'ios' | 'android' | 'web' = Platform.OS === 'ios' ? 'ios' : 'android';

const MENU_ITEMS = [
  {icon: 'clipboard-list-outline', label: 'Order History', badge: null},
  {icon: 'star-circle-outline', label: 'My Rewards', badge: null},
  {icon: 'bell-outline', label: 'Notifications', badge: null},
  {icon: 'help-circle-outline', label: 'Help & Support', badge: null},
  {icon: 'shield-account-outline', label: 'Privacy Policy', badge: null},
  {icon: 'information-outline', label: 'About Build Cafe', badge: null},
];

export const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {user, logout} = useAuthStore();
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [orderCount, setOrderCount] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem('notif_enabled').then(v => {
      if (v === 'true') {setNotifEnabled(true);}
    });
    // Prefer server avatarUrl; fall back to local AsyncStorage cache
    if (user?.avatarUrl) {
      setProfilePic(user.avatarUrl);
    } else {
      AsyncStorage.getItem('profile_pic').then(v => {
        if (v) {setProfilePic(v);}
      });
    }
    ordersAPI.listByUser().then(res => {
      const orders = res.data.orders;
      setOrderCount(orders.length);
      setTotalSpent(orders.reduce((s, o) => s + parseFloat(o.totalAmount), 0));
    }).catch(() => {});
  }, [user?.avatarUrl]);

  const persistNotif = (val: boolean) => {
    setNotifEnabled(val);
    AsyncStorage.setItem('notif_enabled', val ? 'true' : 'false');
  };

  const registerFCMToken = async () => {
    const granted = await requestNotificationPermission();
    if (!granted) {return false;}
    const [token, deviceId] = await Promise.all([getFCMToken(), getDeviceId()]);
    if (!token) {return false;}
    await fcmTokensAPI.register({
      token, deviceId, platform: APP_PLATFORM, app: 'customer',
      ...(user ? {userId: user.id} : {}),
    }).catch(() => {});
    return true;
  };

  const handleImageResult = async (result: ImagePickerResponse) => {
    if (result.didCancel || result.errorCode) {return;}
    const asset = result.assets?.[0];
    if (!asset?.uri) {return;}

    setUploading(true);
    try {
      const contentType = asset.type ?? 'image/jpeg';
      const presignRes = await uploadAPI.presign(contentType, 'avatars');
      const {uploadUrl, publicUrl} = presignRes.data;

      const imgData = await fetch(asset.uri);
      const blob = await imgData.blob();
      await fetch(uploadUrl, {method: 'PUT', body: blob, headers: {'Content-Type': contentType}});

      await authAPI.updateProfile({avatarUrl: publicUrl});
      setProfilePic(publicUrl);
      await AsyncStorage.setItem('profile_pic', publicUrl);
      Toast.show({type: 'success', text1: 'Profile photo updated'});
    } catch {
      Toast.show({type: 'error', text1: 'Failed to upload photo'});
    } finally {
      setUploading(false);
    }
  };

  const openLibrary = () => {
    launchImageLibrary({mediaType: 'photo', quality: 0.8, selectionLimit: 1}, handleImageResult);
  };

  const openCamera = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Toast.show({type: 'error', text1: 'Camera permission denied'});
        return;
      }
    }
    launchCamera({mediaType: 'photo', quality: 0.8}, handleImageResult);
  };

  const handleProfilePicAction = () => {
    const removeOption = profilePic
      ? [{
          text: 'Remove Photo',
          style: 'destructive' as const,
          onPress: async () => {
            setProfilePic(null);
            await AsyncStorage.removeItem('profile_pic');
          },
        }]
      : [];
    Alert.alert('Profile Photo', 'Choose a source', [
      {text: 'Camera', onPress: openCamera},
      {text: 'Photo Library', onPress: openLibrary},
      ...removeOption,
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleNotificationToggle = async () => {
    if (notifEnabled) {
      const deviceId = await getDeviceId();
      await fcmTokensAPI.deactivate(deviceId, 'customer').catch(() => {});
      persistNotif(false);
      Toast.show({type: 'success', text1: 'Notifications disabled'});
    } else {
      const ok = await registerFCMToken();
      if (ok) {
        persistNotif(true);
        Toast.show({type: 'success', text1: 'Notifications enabled'});
      } else {
        Toast.show({type: 'error', text1: 'Allow notifications in Settings'});
      }
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
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} translucent={false} />

      <View style={[styles.topBar, {paddingTop: insets.top + Spacing.md}]}>
        <Text style={styles.topBarTitle}>Profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={handleProfilePicAction} disabled={uploading}>
            {profilePic ? (
              <Image source={{uri: profilePic}} style={styles.avatar} resizeMode="cover" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name="account" size={40} color={Colors.border} />
              </View>
            )}
            {uploading ? (
              <View style={styles.avatarEditBadge}>
                <ActivityIndicator size={12} color={Colors.white} />
              </View>
            ) : (
              <View style={styles.avatarEditBadge}>
                <Icon name="camera" size={14} color={Colors.white} />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.profileName}>{user?.name || 'Guest'}</Text>
          <Text style={styles.profileMobile}>{user?.phone ?? ''}</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{orderCount}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              ₹{totalSpent.toLocaleString('en-IN', {maximumFractionDigits: 0})}
            </Text>
            <Text style={styles.statLabel}>Spent</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.rewardPointsBalance ?? 0}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
        </View>

        {/* Notifications toggle */}
        <View style={styles.notifCard}>
          <View style={styles.notifLeft}>
            <Icon name="bell-outline" size={22} color={notifEnabled ? Colors.accent : Colors.textMuted} />
            <View>
              <Text style={styles.notifTitle}>Push Notifications</Text>
              <Text style={styles.notifSubtitle}>
                {notifEnabled ? 'Order updates enabled' : 'Enable for order updates'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.notifToggle, notifEnabled && styles.notifToggleActive]}
            onPress={handleNotificationToggle}>
            <View style={[styles.notifThumb, notifEnabled && styles.notifThumbActive]} />
          </TouchableOpacity>
        </View>

        {/* Menu items */}
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.menuRow, idx < MENU_ITEMS.length - 1 && styles.menuRowBorder]}
              onPress={() => {
                if (item.label === 'Order History') {(navigation as any).navigate('Orders');}
                if (item.label === 'My Rewards')     {navigation.navigate('Rewards');}
                if (item.label === 'Notifications')  {Linking.openSettings();}
                if (item.label === 'Help & Support')  {navigation.navigate('HelpSupport');}
                if (item.label === 'Privacy Policy') {
                  Linking.openURL('https://buildcafe.tach21.com/privacy').catch(() => {
                    Alert.alert('Privacy Policy', 'Visit buildcafe.tach21.com for our privacy policy.');
                  });
                }
                if (item.label === 'About Build Cafe') {
                  Alert.alert('Build Cafe', 'Version 1.0.0\n\nA café ordering experience built for Build Gym.');
                }
              }}>
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
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topBarTitle: {fontFamily: 'Fraunces-SemiBold', fontSize: 24, color: Colors.textDark},
  scrollContent: {paddingBottom: Spacing.xl, gap: Spacing.md},
  avatarSection: {alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm},
  avatarWrapper: {position: 'relative', marginBottom: Spacing.sm},
  avatar: {width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: Colors.border},
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.inputBg, borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white,
  },
  profileName: {fontFamily: 'Fraunces-SemiBold', fontSize: 24, color: Colors.textDark},
  profileMobile: {fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textMuted},
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
  statValue: {fontFamily: 'Fraunces-Bold', fontSize: 20, color: Colors.textDark},
  statLabel: {
    fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  statDivider: {width: 1, backgroundColor: Colors.border, marginVertical: 4},
  notifCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    marginHorizontal: Spacing.outer, padding: Spacing.md,
    ...Shadow.card, borderWidth: 1, borderColor: Colors.border + '30',
  },
  notifLeft: {flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1},
  notifTitle: {fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textDark},
  notifSubtitle: {fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textMuted, marginTop: 2},
  notifToggle: {
    width: 48, height: 28, borderRadius: 14,
    backgroundColor: Colors.border, padding: 2, justifyContent: 'center',
  },
  notifToggleActive: {backgroundColor: Colors.accent},
  notifThumb: {width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.white},
  notifThumbActive: {alignSelf: 'flex-end'},
  menuCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    marginHorizontal: Spacing.outer,
    ...Shadow.card, borderWidth: 1, borderColor: Colors.border + '30', overflow: 'hidden',
  },
  menuRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md},
  menuRowBorder: {borderBottomWidth: 1, borderBottomColor: Colors.border + '40'},
  menuRowLabel: {flex: 1, fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textDark},
  menuBadge: {
    backgroundColor: Colors.accent, borderRadius: Radius.full,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  menuBadgeText: {fontFamily: 'Inter-Bold', fontSize: 11, color: Colors.white},
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, marginHorizontal: Spacing.outer, paddingVertical: Spacing.md,
    borderWidth: 1, borderColor: Colors.error + '40',
    borderRadius: Radius.full, backgroundColor: Colors.white,
  },
  logoutText: {fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.error},
  version: {
    fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.border,
    textAlign: 'center', paddingBottom: Spacing.md,
  },
});
