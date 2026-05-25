import React from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle, TextInputProps } from 'react-native';
import { colors } from '../theme/colors';

interface InputProps extends Pick<TextInputProps, 'autoCapitalize' | 'autoCorrect' | 'editable'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureTextEntry?: boolean;
  style?: ViewStyle;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
}

export const Input = React.forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    value,
    onChangeText,
    placeholder,
    icon,
    rightIcon,
    secureTextEntry,
    style,
    keyboardType = 'default',
    autoCapitalize,
    autoCorrect,
    editable,
  },
  ref,
) {
  return (
    <View style={[styles.container, style]}>
      {(label || icon) && (
        <View style={styles.labelRow}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          {label ? <Text style={styles.label}>{label}</Text> : null}
        </View>
      )}
      <View style={[styles.inputRow, editable === false && styles.inputDisabled]}>
        <TextInput
          ref={ref}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
          secureTextEntry={secureTextEntry === true}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          editable={editable}
        />
        {rightIcon && <View style={styles.rightIconWrapper}>{rightIcon}</View>}
      </View>
    </View>
  );
});

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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 12,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  rightIconWrapper: {
    paddingRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputDisabled: {
    opacity: 0.6,
  },
});
