import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  dark?: boolean;
}

export function Card({ children, style, dark }: CardProps) {
  return (
    <View style={[styles.card, dark && styles.cardDark, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDark: {
    backgroundColor: '#1E2A3D',
  },
});
