import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { colors } from '../theme/colors';
import { Button } from '../components/Button';
import { apiPost } from '../api/client';

type Props = {
  navigation: any;
  route: { params?: { autoRead?: boolean } };
};

export function OCRScreen({ navigation, route }: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [cameraReady, setCameraReady] = useState(false);

  const buildFallbackOcrText = (uri: string) => {
    const filename = uri.split('/').pop() ?? 'captured image';
    return [
      'OCR fallback mode is active for Expo-safe builds.',
      `Captured: ${filename}`,
      'No native OCR engine is configured in this app build.',
      'You can still review this capture and use text-to-speech.',
    ].join('\n');
  };

  const readText = (text: string) => {
    if (text.trim()) {
      Speech.speak(text, { language: 'en' });
    }
  };

  const runOCR = async () => {
    if (!cameraRef.current || isScanning || !cameraReady) {
      return;
    }
    setIsScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) {
        throw new Error('Capture failed');
      }

      const { response, data } = await apiPost('/ai/read/', {
        image_uri: photo.uri,
      });
      const text =
        response.ok && data && typeof data === 'object'
          ? String((data as { text?: string; result?: string }).text || (data as { result?: string }).result || buildFallbackOcrText(photo.uri))
          : buildFallbackOcrText(photo.uri);
      setOcrText(text || 'No text detected.');

      if (route.params?.autoRead && text) {
        readText(text);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OCR failed';
      Alert.alert('OCR error', message);
    } finally {
      setIsScanning(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.white} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.helpText}>Camera permission is required for OCR.</Text>
          <Button title="Grant camera access" onPress={requestPermission} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>OCR Reader</Text>
      </View>

      <View style={styles.preview}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} onCameraReady={() => setCameraReady(true)} />
      </View>

      <View style={styles.overlayBox}>
        <Text style={styles.overlayTitle}>Detected text</Text>
        <Text style={styles.overlayText}>{ocrText || 'Capture an image to extract text.'}</Text>
      </View>

      <View style={styles.footer}>
        <Button title="Capture & Extract" onPress={runOCR} loading={isScanning} />
        <Button
          title="Read Aloud"
          variant="outline"
          onPress={() => readText(ocrText)}
          disabled={!ocrText || ocrText === 'No text detected.'}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primaryDark },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  helpText: { color: colors.white, marginBottom: 16, fontSize: 16, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: '700' },
  preview: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  overlayBox: {
    margin: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.cardDark,
  },
  overlayTitle: { color: colors.white, fontWeight: '700', marginBottom: 8 },
  overlayText: { color: colors.textLight, lineHeight: 20, minHeight: 60 },
  footer: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
});
