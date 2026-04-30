import React, {useRef, useState} from 'react';
import {View, TextInput, StyleSheet, Pressable} from 'react-native';
import {Colors, Radius, Typography} from '../theme';

interface Props {
  length?: number;
  value: string;
  onChange: (val: string) => void;
}

export const OTPInput: React.FC<Props> = ({
  length = 6,
  value,
  onChange,
}) => {
  const inputsRef = useRef<TextInput[]>([]);
  const digits = value.split('').concat(Array(length).fill('')).slice(0, length);

  const handleChange = (text: string, index: number) => {
    const sanitized = text.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = sanitized;
    onChange(newDigits.join(''));
    if (sanitized && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {digits.map((digit, i) => (
        <Pressable key={i} onPress={() => inputsRef.current[i]?.focus()}>
          <TextInput
            ref={el => {
              if (el) inputsRef.current[i] = el;
            }}
            style={[styles.cell, digit ? styles.cellFilled : null]}
            value={digit}
            onChangeText={t => handleChange(t, i)}
            onKeyPress={({nativeEvent}) =>
              handleKeyPress(nativeEvent.key, i)
            }
            keyboardType="number-pad"
            maxLength={1}
            textAlign="center"
            selectionColor={Colors.accent}
          />
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  cell: {
    width: 48,
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    ...Typography.headlineMD,
    color: Colors.textDark,
    textAlign: 'center',
  },
  cellFilled: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
});
