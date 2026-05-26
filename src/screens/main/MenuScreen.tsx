import React, {useState, useEffect, useCallback} from 'react';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MainStackParamList} from '../../navigation/types';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ImageBackground,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  AppState,
  type AppStateStatus,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import {Colors, Spacing, Radius, Shadow} from '../../theme';
import {VegBadge} from '../../components/VegBadge';
import {AddonPickerModal} from '../../components/AddonPickerModal';
import type {AddonOption} from '../../components/AddonPickerModal';
import {useCartStore} from '../../store/cartStore';
import {useAuthStore} from '../../store/authStore';
import {menuAPI, type MenuCategory, type MenuItem} from '../../services/api';
import {supabase, Channels} from '../../services/supabase';

export const MenuScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addonTarget, setAddonTarget] = useState<MenuItem | null>(null);
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'nonveg'>('all');
  const addItem = useCartStore(s => s.addItem);
  const cartItems = useCartStore(s => s.items);
  const user = useAuthStore(s => s.user);
  const tableNumber = useCartStore(s => s.tableNumber);

  const fetchMenu = useCallback(async () => {
    try {
      const res = await menuAPI.getMenu();
      setCategories(res.data.categories);
    } catch {
      Toast.show({type: 'error', text1: 'Could not load menu'});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        fetchMenu();
      }
    });
    return () => sub.remove();
  }, [fetchMenu]);

  // Supabase Realtime: reflect item availability changes from admin instantly
  useEffect(() => {
    if (!supabase) {return;}
    const channel = supabase
      .channel(Channels.menuAvail(), {config: {private: true}})
      .on('broadcast', {event: 'ITEM_AVAILABLE'}, ({payload}) => {
        const ids: string[] = (payload as {itemIds: string[]}).itemIds ?? [];
        setCategories(prev =>
          prev.map(cat => ({
            ...cat,
            items: cat.items.map(item =>
              ids.includes(item.id) ? {...item, isAvailable: true} : item,
            ),
          })),
        );
      })
      .on('broadcast', {event: 'ITEMS_UNAVAILABLE'}, ({payload}) => {
        const ids: string[] = (payload as {itemIds: string[]}).itemIds ?? [];
        setCategories(prev =>
          prev.map(cat => ({
            ...cat,
            items: cat.items.map(item =>
              ids.includes(item.id) ? {...item, isAvailable: false} : item,
            ),
          })),
        );
      })
      .on('broadcast', {event: 'MENU_UPDATED'}, () => {
        fetchMenu();
      })
      .subscribe((status, err) => {
        if (status !== 'SUBSCRIBED') {
          console.warn('[realtime] menu/availability status:', status, err);
        }
      });

    return () => {
      supabase?.removeChannel(channel);
    };
  }, []);

  const allItems = categories.flatMap(c => c.items);
  const categoryNames = ['All', ...categories.map(c => c.name)];

  const getItemQty = (id: string) =>
    cartItems.filter(i => i.id === id).reduce((s, i) => s + i.quantity, 0);

  const filtered = allItems.filter(item => {
    const matchCat =
      activeCategory === 'All' ||
      categories.find(c => c.name === activeCategory)?.items.some(i => i.id === item.id);
    const matchSearch =
      !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchVeg =
      vegFilter === 'all' || (vegFilter === 'veg' ? item.isVeg : !item.isVeg);
    return matchCat && matchSearch && matchVeg;
  });

  const handleAdd = (item: MenuItem) => {
    const max = item.maxOrderQty ?? 10;
    const currentQty = getItemQty(item.id);
    if (currentQty >= max) {
      Toast.show({type: 'info', text1: `Only ${max} available`});
      return;
    }
    const available = (item.modifiers ?? []).filter(m => m.isAvailable);
    if (available.length > 0) {
      setAddonTarget(item);
    } else {
      addItem({
        id: item.id,
        name: item.name,
        price: parseFloat(item.price),
        isVeg: item.isVeg,
        image: item.imageUrl ?? undefined,
        modifiers: [],
        maxOrderQty: item.maxOrderQty,
      });
    }
  };

  const handleAddonConfirm = (selected: AddonOption[]) => {
    if (!addonTarget) {return;}
    addItem({
      id: addonTarget.id,
      name: addonTarget.name,
      price: parseFloat(addonTarget.price),
      isVeg: addonTarget.isVeg,
      image: addonTarget.imageUrl ?? undefined,
      modifiers: selected,
      maxOrderQty: addonTarget.maxOrderQty,
    });
    setAddonTarget(null);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) {return 'Good morning';}
    if (h < 17) {return 'Good afternoon';}
    return 'Good evening';
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={[styles.topBar, {paddingTop: insets.top + Spacing.md}]}>
        <TouchableOpacity
          style={styles.tableChip}
          onPress={() => navigation.navigate('QRScanner', {context: 'main'})}>
          <Icon name="silverware" size={14} color={Colors.white} />
          <Text style={styles.tableChipText}>Table {tableNumber}</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Build Cafe</Text>
        <View style={styles.topBarRight}>
          <TouchableOpacity onPress={() => navigation.navigate('Search')}>
            <Icon name="magnify" size={24} color={Colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchMenu();
            }}
            tintColor={Colors.accent}
          />
        }>
        <View style={styles.section}>
          <Text style={styles.greetingText}>
            {greeting()}, {user?.name?.split(' ')[0] || 'there'}.
          </Text>
          <Text style={styles.greetingSubtitle}>What feels right today?</Text>
        </View>

        <View style={styles.searchBar}>
          <Icon name="magnify" size={22} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search filter coffee, sandwiches…"
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Category image cards */}
        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryCards}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryCard}
                onPress={() => setActiveCategory(cat.name)}
                activeOpacity={0.85}>
                {cat.imageUrl ? (
                  <ImageBackground
                    source={{uri: cat.imageUrl}}
                    style={styles.categoryCardBg}
                    imageStyle={styles.categoryCardImage}>
                    <View style={styles.categoryCardOverlay} />
                    <Text style={styles.categoryCardLabel}>{cat.name}</Text>
                    {activeCategory === cat.name && (
                      <View style={styles.categoryCardActive} />
                    )}
                  </ImageBackground>
                ) : (
                  <View style={[styles.categoryCardBg, styles.categoryCardPlaceholder]}>
                    <Icon name="food" size={24} color={Colors.border} />
                    <Text style={styles.categoryCardLabelDark}>{cat.name}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}>
          {categoryNames.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, activeCategory === cat && styles.chipActive]}
              onPress={() => setActiveCategory(cat)}>
              <Text
                style={[
                  styles.chipText,
                  activeCategory === cat && styles.chipTextActive,
                ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {activeCategory === 'All' ? 'All Items' : activeCategory}
          </Text>
          <Text style={styles.sectionCount}>{filtered.length} items</Text>
        </View>

        <View style={styles.menuList}>
          {filtered.map(item => {
            const qty = getItemQty(item.id);
            const cap = item.maxOrderQty ?? 10;
            const soldOut = !item.isAvailable || cap === 0;
            const atCap = qty >= cap;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, soldOut && styles.cardUnavailable]}
                onPress={soldOut ? undefined : () => navigation.navigate('ItemDetail', {item})}
                disabled={soldOut}
                activeOpacity={0.95}>
                {item.imageUrl ? (
                  <Image
                    source={{uri: item.imageUrl}}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                    <Icon name="food" size={28} color={Colors.border} />
                  </View>
                )}
                <View style={styles.cardContent}>
                  <View>
                    <View style={styles.cardNameRow}>
                      <VegBadge isVeg={item.isVeg} />
                      <Text style={styles.cardName}>{item.name}</Text>
                    </View>
                    <Text style={styles.cardDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </View>
                  <View style={styles.cardBottom}>
                    <Text style={styles.cardPrice}>
                      ₹{parseFloat(item.price).toFixed(0)}
                    </Text>
                    {soldOut ? (
                      <View style={styles.soldOutBadge}>
                        <Text style={styles.soldOutText}>Sold Out</Text>
                      </View>
                    ) : qty > 0 ? (
                      <View style={styles.qtyControl}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() =>
                            useCartStore.getState().updateQuantity(item.id, qty - 1)
                          }>
                          <Icon name="minus" size={14} color={Colors.textDark} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{qty}</Text>
                        <TouchableOpacity
                          style={[styles.qtyBtn, atCap && {opacity: 0.35}]}
                          disabled={atCap}
                          onPress={() => handleAdd(item)}>
                          <Icon name="plus" size={14} color={Colors.textDark} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => handleAdd(item)}>
                        <Text style={styles.addBtnText}>ADD</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <AddonPickerModal
        visible={addonTarget !== null}
        itemName={addonTarget?.name ?? ''}
        basePrice={parseFloat(addonTarget?.price ?? '0')}
        addons={(addonTarget?.modifiers ?? [])
          .filter(m => m.isAvailable)
          .map(m => ({id: m.id, name: m.name, price: parseFloat(m.price)}))}
        onConfirm={handleAddonConfirm}
        onDismiss={() => setAddonTarget(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  centered: {alignItems: 'center', justifyContent: 'center'},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.outer,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  tableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.textDark,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  tableChipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.white,
  },
  topBarTitle: {
    fontFamily: 'Fraunces-Bold',
    fontSize: 20,
    color: Colors.textDark,
    fontStyle: 'italic',
  },
  topBarRight: {flexDirection: 'row', gap: Spacing.md},
  scrollContent: {paddingBottom: Spacing.xl, gap: Spacing.xl},
  section: {paddingHorizontal: Spacing.outer, paddingTop: Spacing.md},
  greetingText: {
    fontFamily: 'Fraunces-SemiBold',
    fontSize: 28,
    color: Colors.textDark,
    lineHeight: 36,
  },
  greetingSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    height: 52,
    marginHorizontal: Spacing.outer,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.textDark,
    padding: 0,
  },
  // Category image cards
  categoryCards: {paddingHorizontal: Spacing.outer, gap: Spacing.md},
  categoryCard: {
    width: 96,
    height: 96,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.card,
  },
  categoryCardBg: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 8,
  },
  categoryCardImage: {borderRadius: Radius.lg},
  categoryCardOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: Radius.lg,
  },
  categoryCardLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: Colors.white,
    textAlign: 'center',
    zIndex: 1,
  },
  categoryCardActive: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.accent,
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  },
  categoryCardPlaceholder: {
    backgroundColor: Colors.inputBg,
    gap: 6,
  },
  categoryCardLabelDark: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  // Chips
  categoryRow: {paddingHorizontal: Spacing.outer, gap: 10},
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {backgroundColor: Colors.textDark, borderColor: Colors.textDark},
  chipText: {fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textDark},
  chipTextActive: {color: Colors.white},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: Spacing.outer,
  },
  sectionTitle: {
    fontFamily: 'Fraunces-SemiBold',
    fontSize: 22,
    color: Colors.textDark,
  },
  sectionCount: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },
  menuList: {paddingHorizontal: Spacing.outer, gap: Spacing.md},
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    height: 132,
    ...Shadow.card,
    borderWidth: 1,
    borderColor: Colors.border + '30',
  },
  cardImage: {
    width: 100,
    height: '100%',
    borderTopLeftRadius: Radius.lg,
    borderBottomLeftRadius: Radius.lg,
  },
  cardImagePlaceholder: {
    backgroundColor: Colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  cardNameRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4},
  cardName: {fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.textDark},
  cardDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardPrice: {fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.textDark},
  addBtn: {
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: Radius.full,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  addBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: Colors.accent,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 4,
    gap: 4,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.textDark,
    minWidth: 20,
    textAlign: 'center',
  },
  cardUnavailable: {opacity: 0.5},
  soldOutBadge: {
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  soldOutText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  vegFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.outer,
    gap: 10,
  },
  vegPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  vegPillActive: {backgroundColor: Colors.textDark, borderColor: Colors.textDark},
  vegPillText: {fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textDark},
  vegPillTextActive: {color: Colors.white},
});
