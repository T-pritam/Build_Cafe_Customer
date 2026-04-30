import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import {Colors, Radius, Typography} from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<Props> = ({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}) => {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
      style={[
        styles.base,
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        variant === 'outline' && styles.outline,
        (disabled || loading) && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          color={isPrimary ? Colors.white : Colors.textDark}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.label,
            isPrimary && {color: Colors.white},
            isSecondary && {color: Colors.textDark},
            variant === 'outline' && {color: Colors.accent},
            (disabled || loading) && {color: Colors.textMuted},
          ]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  secondary: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.textDark,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  disabled: {
    backgroundColor: Colors.inputBg,
    shadowOpacity: 0,
    elevation: 0,
  },
  label: {
    ...Typography.labelSM,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
