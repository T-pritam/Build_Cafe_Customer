import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import {Colors, Spacing, Typography, Radius, Shadow} from '../../theme';
import {VegBadge} from '../../components/VegBadge';
import {useCartStore} from '../../store/cartStore';
import {useAuthStore} from '../../store/authStore';

const CATEGORIES = ['All', 'Coffee', 'Tea', 'Breakfast', 'Snacks', 'Desserts'];

const MENU_ITEMS = [
  {
    id: '1',
    name: 'Filter Coffee',
    description: 'Slow-brewed South Indian decoction with steamed milk.',
    price: 120,
    category: 'Coffee',
    isVeg: true,
    badge: 'Bestseller',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
  },
  {
    id: '2',
    name: 'Cold Brew',
    description: '12-hour steeped, smooth and chocolatey.',
    price: 180,
    category: 'Coffee',
    isVeg: true,
    badge: null,
    image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400',
  },
  {
    id: '3',
    name: 'Bun Maska',
    description: 'Soft bun with generous butter, served warm.',
    price: 60,
    category: 'Breakfast',
    isVeg: true,
    badge: 'Today\'s pick',
    image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc7b?w=400',
  },
  {
    id: '4',
    name: 'Masala Chai',
    description: 'Freshly brewed spiced tea with ginger and cardamom.',
    price: 80,
    category: 'Tea',
    isVeg: true,
    badge: null,
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400',
  },
  {
    id: '5',
    name: 'Avocado Toast',
    description: 'Sourdough with smashed avocado, chilli flakes and lemon.',
    price: 220,
    category: 'Breakfast',
    isVeg: true,
    badge: null,
    image: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=400',
  },
  {
    id: '6',
    name: 'Affogato',
    description: 'Vanilla gelato drowned in a double shot of espresso.',
    price: 200,
    category: 'Desserts',
    isVeg: true,
    badge: 'New',
    image: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=400',
  },
];

export const MenuScreen: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const addItem = useCartStore(s => s.addItem);
  const cartItems = useCartStore(s => s.items);
  const user = useAuthStore(s => s.user);
  const tableNumber = useCartStore(s => s.tableNumber);

  const getItemQty = (id: string) =>
    cartItems.find(i => i.id === id)?.quantity || 0;

  const filtered = MENU_ITEMS.filter(item => {
    const matchCat = activeCategory === 'All' || item.category === activeCategory;
    const matchSearch =
      !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleAdd = (item: (typeof MENU_ITEMS)[0]) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      isVeg: item.isVeg,
      image: item.image,
    });
    Toast.show({
      type: 'success',
      text1: `${item.name} added to cart`,
      visibilityTime: 1500,
    });
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Top App Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.tableChip}>
          <Icon name="silverware" size={14} color={Colors.white} />
          <Text style={styles.tableChipText}>Table {tableNumber}</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Build Cafe</Text>
        <View style={styles.topBarRight}>
          <TouchableOpacity>
            <Icon name="magnify" size={24} color={Colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Greeting */}
        <View style={styles.section}>
          <Text style={styles.greetingText}>
            {greeting()}, {user?.name?.split(' ')[0] || 'there'}.
          </Text>
          <Text style={styles.greetingSubtitle}>What feels right today?</Text>
        </View>

        {/* Search */}
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

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <Image
            source={{uri: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800'}}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroTag}>TODAY'S RITUAL</Text>
            <Text style={styles.heroTitle}>Filter Coffee + Bun Maska</Text>
            <Text style={styles.heroMeta}>Available till 11 AM · ₹150</Text>
          </View>
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.chip,
                activeCategory === cat && styles.chipActive,
              ]}
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

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {activeCategory === 'All' ? 'All Items' : activeCategory}
          </Text>
          <Text style={styles.sectionCount}>{filtered.length} items</Text>
        </View>

        {/* Menu list */}
        <View style={styles.menuList}>
          {filtered.map(item => {
            const qty = getItemQty(item.id);
            return (
              <View key={item.id} style={styles.card}>
                <Image
                  source={{uri: item.image}}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
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
                    <View>
                      {item.badge ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{item.badge}</Text>
                        </View>
                      ) : null}
                      <Text style={styles.cardPrice}>₹{item.price}</Text>
                    </View>
                    {qty > 0 ? (
                      <View style={styles.qtyControl}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() =>
                            useCartStore
                              .getState()
                              .updateQuantity(item.id, qty - 1)
                          }>
                          <Icon name="minus" size={14} color={Colors.textDark} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{qty}</Text>
                        <TouchableOpacity
                          style={styles.qtyBtn}
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
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.outer,
    paddingVertical: Spacing.md,
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
  scrollContent: {
    paddingBottom: Spacing.xl,
    gap: Spacing.xl,
  },
  section: {
    paddingHorizontal: Spacing.outer,
    paddingTop: Spacing.md,
  },
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
  heroBanner: {
    height: 160,
    marginHorizontal: Spacing.outer,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadow.card,
  },
  heroImage: {width: '100%', height: '100%'},
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(28,20,16,0.55)',
  },
  heroContent: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
  },
  heroTag: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    color: Colors.accentLight,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    fontFamily: 'Fraunces-SemiBold',
    fontSize: 22,
    color: Colors.white,
    lineHeight: 28,
  },
  heroMeta: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: Colors.accentLight,
    marginTop: 2,
  },
  categoryRow: {
    paddingHorizontal: Spacing.outer,
    gap: 10,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.textDark,
    borderColor: Colors.textDark,
  },
  chipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.textDark,
  },
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
  menuList: {
    paddingHorizontal: Spacing.outer,
    gap: Spacing.md,
  },
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
  cardContent: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.textDark,
  },
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
  badge: {
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: Colors.accentLightText,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardPrice: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.textDark,
  },
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
});
