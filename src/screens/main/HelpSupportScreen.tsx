import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors, Spacing, Radius, Shadow} from '../../theme';
import {MainStackParamList} from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'HelpSupport'>;
};

const FAQS = [
  {
    q: 'How do I scan the QR code at my table?',
    a: 'Open your camera app and point it at the QR sticker on your table. Tap the link that appears — the app will open and set up your table session automatically.',
  },
  {
    q: 'What if my QR code is expired?',
    a: 'Table QR codes refresh periodically for security. Simply scan the code again — a fresh session will be created.',
  },
  {
    q: 'My payment went through but the order isn\'t showing.',
    a: 'Payments can take 30–60 seconds to confirm. Pull down on the Orders tab to refresh. If it still doesn\'t appear after 2 minutes, contact staff.',
  },
  {
    q: 'Can I add items to an existing order?',
    a: 'Yes — just add items to your cart and place a new order. Multiple orders for the same session are grouped together in the kitchen.',
  },
  {
    q: 'How do reward points work?',
    a: 'You earn 1 point per ₹10 spent. Points are credited after delivery. You can redeem 10 points for ₹1 off on your next order.',
  },
  {
    q: 'How do I get a refund?',
    a: 'Refunds for cancelled or incorrect orders are processed within 3–5 business days. Contact our support team with your order details.',
  },
];

export const HelpSupportScreen: React.FC<Props> = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<number | null>(null);

  const toggle = (idx: number) =>
    setExpanded(prev => (prev === idx ? null : idx));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} translucent={false} />

      <View style={[styles.topBar, {paddingTop: insets.top + Spacing.md}]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Help & Support</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Contact card */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Need immediate help?</Text>
          <Text style={styles.contactSubtitle}>
            Flag down any staff member or contact us directly.
          </Text>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => Linking.openURL('mailto:help@buildcafe.in')}>
            <Icon name="email-outline" size={18} color={Colors.accent} />
            <Text style={styles.contactBtnText}>Email Support</Text>
          </TouchableOpacity>
        </View>

        {/* FAQ section */}
        <Text style={styles.sectionTitle}>Frequently asked questions</Text>

        {FAQS.map((faq, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.faqCard}
            onPress={() => toggle(idx)}
            activeOpacity={0.8}>
            <View style={styles.faqHeader}>
              <Text style={styles.faqQuestion}>{faq.q}</Text>
              <Icon
                name={expanded === idx ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={Colors.textMuted}
              />
            </View>
            {expanded === idx && (
              <Text style={styles.faqAnswer}>{faq.a}</Text>
            )}
          </TouchableOpacity>
        ))}
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
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {padding: 4},
  topBarTitle: {fontFamily: 'Fraunces-SemiBold', fontSize: 20, color: Colors.textDark},
  placeholder: {width: 30},
  scroll: {padding: Spacing.outer, gap: Spacing.md, paddingBottom: Spacing.xl},
  contactCard: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  contactTitle: {fontFamily: 'Fraunces-SemiBold', fontSize: 18, color: Colors.textDark},
  contactSubtitle: {fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textMedium, lineHeight: 20},
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.accent + '50',
    marginTop: Spacing.sm,
  },
  contactBtnText: {fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.accent},
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.sm,
  },
  faqCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.card,
    borderWidth: 1,
    borderColor: Colors.border + '30',
  },
  faqHeader: {flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm},
  faqQuestion: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.textDark,
    lineHeight: 22,
  },
  faqAnswer: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.textMedium,
    lineHeight: 21,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
