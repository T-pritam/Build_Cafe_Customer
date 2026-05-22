import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { MainTabParamList, MainStackParamList } from './types';
import { MenuScreen } from '../screens/main/MenuScreen';
import { CartScreen } from '../screens/main/CartScreen';
import { OrdersScreen } from '../screens/main/OrdersScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { ItemDetailScreen } from '../screens/main/ItemDetailScreen';
import { OrderTrackingScreen } from '../screens/main/OrderTrackingScreen';
import { OrderSuccessScreen } from '../screens/main/OrderSuccessScreen';
import { SearchScreen } from '../screens/main/SearchScreen';
import { HelpSupportScreen } from '../screens/main/HelpSupportScreen';
import { SessionNamePromptScreen } from '../screens/main/SessionNamePromptScreen';
import { CubeTrackingScreen } from '../screens/main/CubeTrackingScreen';
import { OrderDetailScreen } from '../screens/main/OrderDetailScreen';
import { RewardsScreen } from '../screens/main/RewardsScreen';
import { QRScannerScreen } from '../screens/shared/QRScannerScreen';
import { Colors } from '../theme';
import { useCartStore } from '../store/cartStore';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Menu: { active: 'food', inactive: 'food-outline' },
  Cart: { active: 'shopping', inactive: 'shopping-outline' },
  Orders: { active: 'clipboard-list', inactive: 'clipboard-list-outline' },
  Profile: { active: 'account-circle', inactive: 'account-circle-outline' },
};

const TabNavigator: React.FC = () => {
  const cartCount = useCartStore(s => s.totalItems());
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: [styles.tabBar, {
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
        }],
        tabBarItemStyle: styles.tabItem,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textDark + '70',
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({focused, color}) => {
          const icons = TAB_ICONS[route.name];
          return (
            // ← Removed outer View, icon renders directly
            <Icon
              name={focused ? icons.active : icons.inactive}
              size={24}
              color={color}
            />
          );
        },
      })}>
      <Tab.Screen name="Menu" component={MenuScreen} />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: styles.badge,
        }}
      />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export const MainNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Tabs" component={TabNavigator} />
    <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
    <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
    <Stack.Screen name="Rewards" component={RewardsScreen} />
    <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
    <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{ gestureEnabled: false }} />
    <Stack.Screen name="Search" component={SearchScreen} />
    <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
    <Stack.Screen name="SessionNamePrompt" component={SessionNamePromptScreen}
      options={{ presentation: 'modal', headerShown: false }} />
    <Stack.Screen name="CubeTracking" component={CubeTrackingScreen}
      options={{ headerShown: false }} />
    <Stack.Screen
      name="QRScanner"
      component={QRScannerScreen}
      options={{presentation: 'fullScreenModal'}}
    />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    elevation: 0,
    shadowOpacity: 0,
    overflow: 'visible',      // ← visible on bar itself
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',      // ← visible on each item
    paddingTop: 0,
    paddingBottom: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  tabLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  badge: {
    backgroundColor: Colors.accent,
    fontSize: 10,
  },
});
