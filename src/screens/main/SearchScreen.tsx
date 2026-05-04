import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ImageBackground,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors, Spacing, Radius, Shadow} from '../../theme';
import {VegBadge} from '../../components/VegBadge';
import {AddonPickerModal} from '../../components/AddonPickerModal';
import type {AddonOption} from '../../components/AddonPickerModal';
import {useCartStore} from '../../store/cartStore';
import {menuAPI, type MenuItem, type MenuCategory} from '../../services/api';
import {MainStackParamList} from '../../navigation/types';

const RECENT_KEY = 'buildcafe_recent_searches';
const MAX_RECENT = 5;
const {width} = Dimensions.get('window');
const CARD_GAP = Spacing.md;
const CARD_SIZE = (width - Spacing.outer * 2 - CARD_GAP) / 2;

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Search'>;
};

export const SearchScreen: React.FC<Props> = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [allItems, setAllItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [addonTarget, setAddonTarget] = useState<MenuItem | null>(null);
  const addItem = useCartStore(s => s.addItem);
  const cartItems = useCartStore(s => s.items);

  const fetchMenu = useCallback(async () => {
    try {
      const res = await menuAPI.getMenu();
      setCategories(res.data.categories);
      setAllItems(res.data.categories.flatMap((c: MenuCategory) => c.items));
    } catch {
      // silent fail on search screen
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRecent = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(RECENT_KEY);
      if (raw) {setRecentSearches(JSON.parse(raw));}
    } catch {}
  }, []);

  const saveSearch = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) {return;}
    setRecentSearches(prev => {
      const deduped = [trimmed, ...prev.filter(r => r !== trimmed)].slice(0, MAX_RECENT);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(deduped)).catch(() => {});
      return deduped;
    });
  }, []);

  const clearRecent = useCallback(async () => {
    await AsyncStorage.removeItem(RECENT_KEY).catch(() => {});
    setRecentSearches([]);
  }, []);

  useEffect(() => {
    fetchMenu();
    loadRecent();
  }, [fetchMenu, loadRecent]);

  const results = query.trim()
    ? allItems.filter(
        i =>
          i.isAvailable &&
          (i.name.toLowerCase().includes(query.toLowerCase()) ||
            (i.description ?? '').toLowerCase().includes(query.toLowerCase())),
      )
    : [];

  const getQty = (id: string) =>
    cartItems.filter(i => i.id === id).reduce((s, i) => s + i.quantity, 0);

  const handleAdd = (item: MenuItem) => {
    const available = (item.modifiers ?? []).filter(m => m.isAvailable);
    if (available.length > 0) {
      setAddonTarget(item);
    } else {
      addItem({id: item.id, name: item.name, price: parseFloat(item.price), isVeg: item.isVeg, image: item.imageUrl ?? undefined, modifiers: []});
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
    });
    setAddonTarget(null);
  };

  const handleSubmit = () => {
    if (query.trim()) {saveSearch(query);}
  };

  const handleRecentTap = (term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} translucent={false} />

      <View style={[styles.topBar, {paddingTop: insets.top + Spacing.md}]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={Colors.textDark} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Icon name="magnify" size={20} color={Colors.textMuted} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search filter coffee, sandwiches…"
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Icon name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : query.trim() !== '' ? (
        /* ── Results view ── */
        results.length === 0 ? (
          <View style={styles.centered}>
            <Icon name="food-off-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyTitle}>No results</Text>
            <Text style={styles.emptySubtitle}>Try a different search term</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={i => i.id}
            contentContainerStyle={styles.list}
            renderItem={({item}) => {
              const qty = getQty(item.id);
              return (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => navigation.navigate('ItemDetail', {item})}>
                  {item.imageUrl ? (
                    <Image source={{uri: item.imageUrl}} style={styles.cardImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                      <Icon name="food" size={24} color={Colors.border} />
                    </View>
                  )}
                  <View style={styles.cardContent}>
                    <View style={styles.nameRow}>
                      <VegBadge isVeg={item.isVeg} />
                      <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                    </View>
                    <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
                    <View style={styles.cardBottom}>
                      <Text style={styles.cardPrice}>₹{parseFloat(item.price).toFixed(0)}</Text>
                      {qty > 0 ? (
                        <View style={styles.qtyChip}>
                          <Text style={styles.qtyChipText}>{qty} in cart</Text>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.addBtn} onPress={() => handleAdd(item)}>
                          <Text style={styles.addBtnText}>ADD</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )
      ) : (
        /* ── Discovery view ── */
        <ScrollView contentContainerStyle={styles.discovery} showsVerticalScrollIndicator={false}>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>RECENT</Text>
                <TouchableOpacity onPress={clearRecent}>
                  <Text style={styles.clearBtn}>Clear</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentRow}>
                {recentSearches.map((term, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.recentChip}
                    onPress={() => handleRecentTap(term)}>
                    <Icon name="clock-outline" size={14} color={Colors.textMuted} />
                    <Text style={styles.recentChipText}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Trending */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>TRENDING</Text>
            </View>
            <Text style={styles.trendingEmpty}>Trending items coming soon</Text>
          </View>

          {/* Browse by Category */}
          {categories.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>BROWSE BY CATEGORY</Text>
              </View>
              <View style={styles.categoryGrid}>
                {categories.slice(0, 4).map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.categoryCard}
                    activeOpacity={0.85}
                    onPress={() => navigation.goBack()}>
                    {cat.imageUrl ? (
                      <ImageBackground
                        source={{uri: cat.imageUrl}}
                        style={styles.categoryCardBg}
                        imageStyle={styles.categoryCardImg}>
                        <View style={styles.categoryOverlay} />
                        <Text style={styles.categoryCardName}>{cat.name}</Text>
                      </ImageBackground>
                    ) : (
                      <View style={[styles.categoryCardBg, styles.categoryCardPlaceholder]}>
                        <Icon name="food" size={28} color={Colors.border} />
                        <Text style={styles.categoryCardNameDark}>{cat.name}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.outer,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {padding: 4},
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    height: 44,
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
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm},
  emptyTitle: {fontFamily: 'Fraunces-SemiBold', fontSize: 20, color: Colors.textDark},
  emptySubtitle: {fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textMuted},
  // Results list
  list: {padding: Spacing.outer, gap: Spacing.md},
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    height: 100,
    ...Shadow.card,
    borderWidth: 1,
    borderColor: Colors.border + '30',
  },
  cardImage: {width: 100, height: '100%', borderTopLeftRadius: Radius.lg, borderBottomLeftRadius: Radius.lg},
  cardImagePlaceholder: {backgroundColor: Colors.inputBg, alignItems: 'center', justifyContent: 'center'},
  cardContent: {flex: 1, padding: Spacing.md, justifyContent: 'space-between'},
  nameRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  cardName: {fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textDark, flex: 1},
  cardDesc: {fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textMuted},
  cardBottom: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  cardPrice: {fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textDark},
  addBtn: {
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  addBtnText: {fontFamily: 'Inter-SemiBold', fontSize: 11, color: Colors.accent, letterSpacing: 1, textTransform: 'uppercase'},
  qtyChip: {backgroundColor: Colors.accentLight, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4},
  qtyChipText: {fontFamily: 'Inter-SemiBold', fontSize: 11, color: Colors.accent},
  // Discovery view
  discovery: {padding: Spacing.outer, gap: Spacing.xl, paddingBottom: Spacing.xl},
  section: {gap: Spacing.md},
  sectionHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  clearBtn: {fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.accent},
  recentRow: {gap: Spacing.sm, paddingBottom: 2},
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    ...Shadow.card,
  },
  recentChipText: {fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textDark},
  trendingEmpty: {fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textMuted, fontStyle: 'italic'},
  // Category grid (2×2)
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  categoryCard: {
    width: CARD_SIZE,
    height: 160,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.card,
  },
  categoryCardBg: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.md,
  },
  categoryCardImg: {borderRadius: Radius.lg},
  categoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: Radius.lg,
  },
  categoryCardName: {
    fontFamily: 'Fraunces-SemiBold',
    fontSize: 18,
    color: Colors.white,
    zIndex: 1,
  },
  categoryCardPlaceholder: {
    backgroundColor: Colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  categoryCardNameDark: {
    fontFamily: 'Fraunces-SemiBold',
    fontSize: 16,
    color: Colors.textMuted,
  },
});
