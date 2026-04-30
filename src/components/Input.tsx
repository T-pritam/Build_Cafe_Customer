import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import {Colors, Radius, Typography, Spacing} from '../theme';

interface Props extends TextInputProps {
  label?: string;
  hint?: string;
  prefix?: string;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<Props> = ({
  label,
  hint,
  prefix,
  containerStyle,
  ...props
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputRow,
          focused && styles.inputFocused,
        ]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.textMuted + '80'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {gap: 6},
  label: {
    ...Typography.metaXS,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    height: 56,
  },
  inputFocused: {
    borderColor: Colors.accent,
  },
  prefix: {
    ...Typography.bodyMD,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textDark,
    marginRight: Spacing.sm,
    paddingRight: Spacing.sm,
    borderRightWidth: 1,
    borderRightColor: Colors.border + '80',
  },
  input: {
    flex: 1,
    ...Typography.bodyMD,
    color: Colors.textDark,
    padding: 0,
  },
  hint: {
    ...Typography.metaXS,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
