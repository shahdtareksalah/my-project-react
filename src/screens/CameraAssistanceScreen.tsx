import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CameraView,
  useCameraPermissions,
  type CameraType,
} from 'expo-camera';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import { apiPost } from '../api/client';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CameraAssistance'>;
};

export function CameraAssistanceScreen({ navigation }: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [detectedText, setDetectedText] = useState('');

  const buildFallbackOcrText = useCallback((uri: string) => {
    const filename = uri.split('/').pop() ?? 'captured image';
    return [
      'OCR fallback mode is active.',
      `Captured: ${filename}`,
      'Native OCR is not enabled in this Expo build.',
    ].join('\n');
  }, []);

  const toggleFacing = useCallback(() => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }, []);

  const takePicture = useCallback(async () => {
    if (!cameraRef.current || !isCameraReady || isCapturing) return;
    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      if (photo?.uri) {
        const fallbackText = buildFallbackOcrText(photo.uri);
        const { response, data } = await apiPost('/ai/describe/', {
          image_uri: photo.uri,
        });
        const describedText =
          response.ok && data && typeof data === 'object'
            ? String((data as { description?: string; result?: string }).description || (data as { result?: string }).result || fallbackText)
            : fallbackText;
        setDetectedText(describedText || 'No text detected');
        if (Platform.OS !== 'web' && !describedText) {
          Alert.alert('Photo captured', 'No text was detected in this frame.', [{ text: 'OK' }]);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to take picture';
      Alert.alert('Error', message);
    } finally {
      setIsCapturing(false);
    }
  }, [buildFallbackOcrText, isCameraReady, isCapturing]);

  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Permission still loading
  if (permission === null) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.white} />
          <Text style={styles.messageText}>Checking camera permission…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={goBack}>
            <Ionicons name="close" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <View style={styles.permissionIcon}>
            <Ionicons name="camera-outline" size={48} color={colors.white} />
          </View>
          <Text style={styles.messageText}>
            We need your permission to show the camera for AI-powered assistance.
          </Text>
          <Button
            title="Grant camera access"
            onPress={requestPermission}
            style={styles.permissionButton}
          />
          <TouchableOpacity onPress={goBack} style={styles.backLink}>
            <Text style={styles.backLinkText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Camera granted: show live preview
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.cameraBadge}>
          <View style={styles.redDot} />
          <Text style={styles.cameraBadgeText}>Camera Active</Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={goBack}>
          <Ionicons name="close" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.previewContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          onCameraReady={() => setIsCameraReady(true)}
          onMountError={({ message }) => {
            Alert.alert('Camera error', message);
          }}
        />
        <View pointerEvents="none" style={styles.aiOverlay}>
          <View style={[styles.aiBox, { top: '20%', left: '12%' }]} />
          <View style={[styles.aiBox, { top: '45%', left: '28%', width: 140 }]} />
          <Text style={styles.aiLabel}>AI assist overlay active</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.flipButton, !isCameraReady && styles.buttonDisabled]}
          onPress={toggleFacing}
          disabled={!isCameraReady}
        >
          <Ionicons name="camera-reverse-outline" size={28} color={colors.white} />
          <Text style={styles.flipButtonText}>Flip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.captureButton, (!isCameraReady || isCapturing) && styles.buttonDisabled]}
          onPress={takePicture}
          disabled={!isCameraReady || isCapturing}
        >
          {isCapturing ? (
            <ActivityIndicator color={colors.primaryDark} size="small" />
          ) : (
            <View style={styles.captureButtonInner} />
          )}
        </TouchableOpacity>

        <View style={styles.placeholderButton} />
      </View>

      <View style={styles.secondaryActions}>
        <Button
          title="DESCRIBE"
          variant="outline"
          onPress={takePicture}
          icon={<Ionicons name="document-text-outline" size={18} color={colors.white} />}
          style={styles.secondaryBtn}
          textStyle={{ color: colors.white }}
        />
        <Button
          title="READ"
          variant="outline"
          onPress={() => navigation.navigate('OCR', { autoRead: true })}
          icon={<Ionicons name="book-outline" size={18} color={colors.white} />}
          style={styles.secondaryBtn}
          textStyle={{ color: colors.white }}
        />
      </View>
      <View style={styles.ocrResultBox}>
        <Text style={styles.ocrResultTitle}>Captured OCR Text</Text>
        <Text style={styles.ocrResultText}>{detectedText || 'Capture a frame to see recognized text.'}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cameraBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardDark,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.emergency,
  },
  cameraBadgeText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '600',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.cardDark,
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
  permissionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButton: {
    marginTop: 24,
    minWidth: 200,
  },
  backLink: {
    marginTop: 20,
  },
  backLinkText: {
    fontSize: 16,
    color: colors.info,
  },
  previewContainer: {
    flex: 1,
    overflow: 'hidden',
    marginHorizontal: 16,
    borderRadius: 16,
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingVertical: 24,
  },
  flipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  flipButtonText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'transparent',
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
  },
  placeholderButton: {
    width: 72,
    height: 72,
  },
  secondaryActions: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  secondaryBtn: {
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: colors.cardDark,
  },
  aiOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 16,
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
  ocrResultBox: {
    marginHorizontal: 20,
    marginBottom: 18,
    backgroundColor: colors.cardDark,
    borderRadius: 12,
    padding: 12,
  },
  ocrResultTitle: {
    color: colors.white,
    fontWeight: '700',
    marginBottom: 6,
  },
  ocrResultText: {
    color: colors.textLight,
    lineHeight: 18,
  },
});
