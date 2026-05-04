import React, {useState} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Colors, Spacing, Radius, Shadow} from '../theme';

export interface AddonOption {
  id: string;
  name: string;
  price: number;
}

interface Props {
  visible: boolean;
  itemName: string;
  basePrice: number;
  addons: AddonOption[];
  onConfirm: (selected: AddonOption[]) => void;
  onDismiss: () => void;
}

export const AddonPickerModal: React.FC<Props> = ({
  visible,
  itemName,
  basePrice,
  addons,
  onConfirm,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id],
    );
  };

  const selectedAddons = addons.filter(a => selected.includes(a.id));
  const addonTotal = selectedAddons.reduce((s, a) => s + a.price, 0);
  const total = basePrice + addonTotal;

  const handleConfirm = () => {
    onConfirm(selectedAddons);
    setSelected([]);
  };

  const handleSkip = () => {
    onConfirm([]);
    setSelected([]);
  };

  const handleDismiss = () => {
    setSelected([]);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleDismiss}
      />
      <View style={[styles.sheet, {paddingBottom: insets.bottom + Spacing.md}]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Customise</Text>
            <Text style={styles.subtitle}>{itemName}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
            <Icon name="close" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Addons list */}
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          {addons.map(addon => {
            const isOn = selected.includes(addon.id);
            return (
              <TouchableOpacity
                key={addon.id}
                style={[styles.row, isOn && styles.rowSelected]}
                onPress={() => toggle(addon.id)}
                activeOpacity={0.7}>
                <View style={[styles.check, isOn && styles.checkOn]}>
                  {isOn && <Icon name="check" size={13} color={Colors.white} />}
                </View>
                <Text style={styles.addonName}>{addon.name}</Text>
                <Text style={styles.addonPrice}>+₹{addon.price.toFixed(0)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>No extras</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={handleConfirm}>
            <Text style={styles.addText}>
              Add to Cart · ₹{total.toFixed(0)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.outer,
    paddingTop: Spacing.sm,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: 'Fraunces-SemiBold',
    fontSize: 20,
    color: Colors.textDark,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  list: {marginBottom: Spacing.md},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  rowSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  addonName: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.textDark,
  },
  addonPrice: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  skipBtn: {
    flex: 1,
    height: 50,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.textMedium,
  },
  addBtn: {
    flex: 2,
    height: 50,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.button,
  },
  addText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.white,
  },
});
