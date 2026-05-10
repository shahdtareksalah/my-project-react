import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { colors } from '../theme/colors';
import { Button } from '../components/Button';
import {
  apiPostFormData,
  API_PATHS,
  createImageFormData,
  extractApiErrorMessage,
} from '../api/client';

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
        throw new Error('No image was captured. Please try again.');
      }

      const formData = createImageFormData(photo.uri);
      const { response, data } = await apiPostFormData(API_PATHS.mockRead, formData, false);
      if (!response.ok) {
        throw new Error(extractApiErrorMessage(data, response.status));
      }

      const extractedText =
        data &&
        typeof data === 'object' &&
        'ocr_data' in data &&
        (data as { ocr_data?: { full_text?: string } }).ocr_data
          ? String((data as { ocr_data?: { full_text?: string } }).ocr_data?.full_text ?? '')
          : '';
      const normalizedText = extractedText.trim();
      if (!normalizedText) {
        throw new Error('OCR completed but no text was detected in the image.');
      }

      setOcrText(normalizedText);

      if (route.params?.autoRead) {
        readText(normalizedText);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'OCR request failed due to a network or server issue.';
      setOcrText('');
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