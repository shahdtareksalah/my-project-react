import React from 'react';
import { Alert, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useSafety } from '../context/SafetyContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function EmergencyScreen({ navigation }: any) {
  const { sendEmergency } = useSafety();
  const [isParent, setIsParent] = React.useState(false);

  React.useEffect(() => {
    const checkRole = async () => {
      try {
        const profileStr = await AsyncStorage.getItem('user_profile');
        if (profileStr) {
          const profile = JSON.parse(profileStr);
          if (profile.role === 'parent') {
            setIsParent(true);
          }
        }
      } catch (err) {
        console.warn('Failed to parse user profile', err);
      }
    };
    checkRole();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.emergencyButton, isParent && styles.disabledButton]}
          onPress={async () => {
            if (isParent) {
              Alert.alert('Action Disabled', 'SOS is only available for children.');
              return;
            }
            try {
              await sendEmergency('manual');
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Emergency failed';
              Alert.alert('Emergency Error', message);
            }
          }}
          activeOpacity={isParent ? 1 : 0.9}
        >
          <Ionicons name="warning" size={48} color={colors.white} />
          <Text style={styles.emergencyLabel}>EMERGENCY</Text>
        </TouchableOpacity>

        <Text style={styles.instruction}>
          {isParent ? 'SOS Available for Children Only' : 'Press in case of emergency'}
        </Text>

        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backLinkText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emergencyButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.emergency,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: colors.emergency,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    shadowColor: '#9CA3AF',
  },
  emergencyLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    marginTop: 12,
    letterSpacing: 1,
  },
  instruction: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 48,
  },
  backLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backLinkText: {
    fontSize: 16,
    color: colors.info,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
