import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {MainTabParamList} from './types';
import {MenuScreen} from '../screens/main/MenuScreen';
import {CartScreen} from '../screens/main/CartScreen';
import {OrdersScreen} from '../screens/main/OrdersScreen';
import {ProfileScreen} from '../screens/main/ProfileScreen';
import {Colors} from '../theme';
import {useCartStore} from '../store/cartStore';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, {active: string; inactive: string}> = {
  Menu: {active: 'silverware', inactive: 'silverware'},
  Cart: {active: 'shopping', inactive: 'shopping-outline'},
  Orders: {active: 'receipt', inactive: 'receipt-outline'},
  Profile: {active: 'account', inactive: 'account-outline'},
};

export const MainNavigator: React.FC = () => {
  const cartCount = useCartStore(s => s.totalItems());

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textDark + '70',
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({focused, color, size}) => {
          const icons = TAB_ICONS[route.name];
          return (
            <View
              style={[
                styles.iconWrap,
                focused && styles.iconWrapActive,
              ]}>
              <Icon
                name={focused ? icons.active : icons.inactive}
                size={22}
                color={color}
                style={focused ? {'FILL': 1} as any : undefined}
              />
            </View>
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

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 80,
    paddingBottom: 16,
    paddingTop: 8,
  },
  tabLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  iconWrap: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
  },
  iconWrapActive: {
    backgroundColor: Colors.accentLight,
  },
  badge: {
    backgroundColor: Colors.accent,
    fontSize: 10,
  },
});
