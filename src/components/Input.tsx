import React from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  secureTextEntry?: boolean;
  style?: ViewStyle;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  secureTextEntry,
  style,
  keyboardType = 'default',
}: InputProps) {
  return (
    <View style={[styles.container, style]}>
      {(label || icon) && (
        <View style={styles.labelRow}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          {label ? <Text style={styles.label}>{label}</Text> : null}
        </View>
      )}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        secureTextEntry={secureTextEntry === true}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  iconWrapper: {
    marginRight: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
});
