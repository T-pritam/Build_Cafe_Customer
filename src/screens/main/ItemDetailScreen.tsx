import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {Colors, Spacing, Radius, Shadow} from '../../theme';
import {VegBadge} from '../../components/VegBadge';
import {Button} from '../../components/Button';
import {AddonPickerModal, AddonOption} from '../../components/AddonPickerModal';
import {useCartStore} from '../../store/cartStore';
import {MainStackParamList} from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'ItemDetail'>;
  route: RouteProp<MainStackParamList, 'ItemDetail'>;
};

export const ItemDetailScreen: React.FC<Props> = ({navigation, route}) => {
  const insets = useSafeAreaInsets();
  const {item} = route.params;
  const [showAddonModal, setShowAddonModal] = useState(false);

  const cartItems = useCartStore(s => s.items);
  const addItem = useCartStore(s => s.addItem);
  const updateQuantity = useCartStore(s => s.updateQuantity);

  const basePrice = parseFloat(item.price);
  const availableAddons: AddonOption[] = (item.modifiers ?? [])
    .filter(m => m.isAvailable)
    .map(m => ({id: m.id, name: m.name, price: parseFloat(m.price)}));

  // Find any cart entry for this item (for qty display)
  const cartEntries = cartItems.filter(i => i.id === item.id);
  const totalQty = cartEntries.reduce((s, i) => s + i.quantity, 0);

  const handleAddPress = () => {
    if (availableAddons.length > 0) {
      setShowAddonModal(true);
    } else {
      doAddToCart([]);
    }
  };

  const doAddToCart = (selectedAddons: AddonOption[]) => {
    setShowAddonModal(false);
    addItem({
      id: item.id,
      name: item.name,
      price: basePrice,
      isVeg: item.isVeg,
      image: item.imageUrl ?? undefined,
      modifiers: selectedAddons,
    });
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} translucent={false} />

      <TouchableOpacity
        style={[styles.backBtn, {top: insets.top + Spacing.sm}]}
        onPress={() => navigation.goBack()}>
        <Icon name="arrow-left" size={22} color={Colors.textDark} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {item.imageUrl ? (
          <Image source={{uri: item.imageUrl}} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={[styles.heroImage, styles.heroPlaceholder]}>
            <Icon name="food" size={64} color={Colors.border} />
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <VegBadge isVeg={item.isVeg} />
            {item.sortOrder === 1 && (
              <View style={styles.bestsellerChip}>
                <Text style={styles.bestsellerText}>Bestseller</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.price}>₹{basePrice.toFixed(0)}</Text>

          {item.description ? (
            <Text style={styles.description}>{item.description}</Text>
          ) : null}

          {availableAddons.length > 0 && (
            <View style={styles.addonHint}>
              <Icon name="plus-circle-outline" size={16} color={Colors.accent} />
              <Text style={styles.addonHintText}>
                {availableAddons.length} extra{availableAddons.length > 1 ? 's' : ''} available — choose when adding
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, {paddingBottom: insets.bottom + Spacing.md}]}>
        {totalQty > 0 ? (
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => {
                const last = cartEntries[cartEntries.length - 1];
                if (last) {updateQuantity(last.cartKey, last.quantity - 1);}
              }}>
              <Icon name="minus" size={18} color={Colors.textDark} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{totalQty} in cart</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={handleAddPress}>
              <Icon name="plus" size={18} color={Colors.textDark} />
            </TouchableOpacity>
          </View>
        ) : (
          <Button
            label={`Add to Cart · ₹${basePrice.toFixed(0)}`}
            onPress={handleAddPress}
          />
        )}
      </View>

      <AddonPickerModal
        visible={showAddonModal}
        itemName={item.name}
        basePrice={basePrice}
        addons={availableAddons}
        onConfirm={doAddToCart}
        onDismiss={() => setShowAddonModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  backBtn: {
    position: 'absolute',
    left: Spacing.outer,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  scroll: {paddingBottom: 100},
  heroImage: {width: '100%', height: 320},
  heroPlaceholder: {backgroundColor: Colors.inputBg, alignItems: 'center', justifyContent: 'center'},
  content: {padding: Spacing.outer, gap: Spacing.md},
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap'},
  bestsellerChip: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.accent + '50',
  },
  bestsellerText: {fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.accent},
  title: {fontFamily: 'Fraunces-Bold', fontSize: 28, color: Colors.textDark, lineHeight: 34},
  price: {fontFamily: 'Inter-SemiBold', fontSize: 22, color: Colors.accent},
  description: {fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textMedium, lineHeight: 22},
  addonHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  addonHintText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.accentLightText,
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.outer,
    paddingTop: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  qtyBtn: {padding: Spacing.sm},
  qtyText: {fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.textDark},
});
