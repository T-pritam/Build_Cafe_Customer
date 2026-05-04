import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {Colors, Spacing, Radius, Shadow} from '../../theme';
import {Button} from '../../components/Button';
import {MainStackParamList} from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'OrderSuccess'>;
  route: RouteProp<MainStackParamList, 'OrderSuccess'>;
};

export const OrderSuccessScreen: React.FC<Props> = ({navigation, route}) => {
  const insets = useSafeAreaInsets();
  const {orderId, tableNumber, totalAmount} = route.params;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return (
    <View style={[styles.container, {paddingTop: insets.top, paddingBottom: insets.bottom}]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} translucent={false} />

      <View style={styles.body}>
        <Animated.View style={[styles.iconRing, {transform: [{scale}]}]}>
          <Icon name="check-bold" size={52} color={Colors.success} />
        </Animated.View>

        <Text style={styles.title}>Order Placed!</Text>
        <Text style={styles.subtitle}>
          Your order is heading to the kitchen. Sit back and relax.
        </Text>

        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Table</Text>
            <Text style={styles.detailValue}>{tableNumber}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount paid</Text>
            <Text style={styles.detailValue}>₹{totalAmount}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          label="Track your order"
          onPress={() =>
            navigation.replace('OrderTracking', {
              orderId,
              initialStatus: 'NEW',
              tableNumber,
              totalAmount,
            })
          }
        />
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.popToTop()}>
          <Text style={styles.secondaryBtnText}>Back to Menu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  body: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.outer, gap: Spacing.lg},
  iconRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {fontFamily: 'Fraunces-Bold', fontSize: 36, color: Colors.textDark, textAlign: 'center'},
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.textMedium,
    textAlign: 'center',
    lineHeight: 24,
  },
  detailCard: {
    alignSelf: 'stretch',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    ...Shadow.card,
    borderWidth: 1,
    borderColor: Colors.border + '30',
  },
  detailRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm},
  detailDivider: {height: 1, backgroundColor: Colors.border},
  detailLabel: {fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textMuted},
  detailValue: {fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textDark},
  footer: {
    paddingHorizontal: Spacing.outer,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  secondaryBtn: {alignItems: 'center', paddingVertical: Spacing.md},
  secondaryBtnText: {fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.textMuted},
});
