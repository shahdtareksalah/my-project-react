import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CameraAssistance'>;
};

export function VideoAssistanceScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    // Automatically request camera permissions as soon as it loads if not already granted
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (!permission) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.white} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={goBack}>
            <Ionicons name="close" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.messageText}>
            We need your permission to show the camera feed.
          </Text>
          <Button
            title="Grant camera access"
            onPress={requestPermission}
            style={styles.permissionButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" />
      <View style={styles.headerAbsolute}>
        <TouchableOpacity style={styles.closeButton} onPress={goBack}>
          <Ionicons name="close" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>
      <View pointerEvents="none" style={styles.aiOverlay}>
        <View style={[styles.aiBox, { top: '20%', left: '12%' }]} />
        <View style={[styles.aiBox, { top: '45%', left: '28%', width: 140 }]} />
        <Text style={styles.aiLabel}>AI assist overlay active</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  headerAbsolute: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  messageText: {
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    marginTop: 16,
  },
  permissionButton: {
    marginTop: 24,
    minWidth: 200,
  },
  aiOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 16,
    zIndex: 5,
  },
  aiBox: {
    position: 'absolute',
    width: 120,
    height: 60,
    borderWidth: 2,
    borderColor: '#00E5FF',
    borderRadius: 8,
  },
  aiLabel: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(16,20,42,0.75)',
    color: colors.white,
    fontWeight: '600',
  },
});
