import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';

// Voice and Speech
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import * as Speech from 'expo-speech';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CameraAssistance'>;
};

export function VideoAssistanceScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isAssistanceActive, setIsAssistanceActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Automatically request camera permissions as soon as it loads if not already granted
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Pulsating animation for the listening indicator
  useEffect(() => {
    if (isListening && !isAssistanceActive) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, isAssistanceActive, pulseAnim]);

  const onStartAssistance = useCallback(async () => {
    if (isAssistanceActive) return;

    try {
      await Voice.stop();
      setIsListening(false);
    } catch (e) {
      console.warn('Voice stop error:', e);
    }

    setIsAssistanceActive(true);
    Speech.speak("Assistant starting. I am now scanning your surroundings.", {
      language: 'en',
    });
  }, [isAssistanceActive]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const onSpeechResults = (e: SpeechResultsEvent) => {
        if (!isActive || isAssistanceActive) return;
        const textResults = e.value || [];
        const detected = textResults.some(
          (text) => text.toLowerCase().includes('start') || text.includes('ابدأ')
        );
        if (detected) {
          onStartAssistance();
        }
      };

      const onSpeechError = (e: SpeechErrorEvent) => {
        // Restart listening if there's a timeout/error and we are not active yet
        if (isActive && !isAssistanceActive) {
          startListening();
        } else {
          console.warn('Voice recognition error:', e.error);
        }
      };

      const onSpeechEnd = () => {
        // Restart listening to keep it active
        if (isActive && !isAssistanceActive) {
          startListening();
        }
      };

      const startListening = async () => {
        if (!isActive || isAssistanceActive) return;
        try {
          // You could also try 'ar-SA' if Arabic is the primary language
          await Voice.start('en-US');
          setIsListening(true);
        } catch (e) {
          console.warn('Voice start error:', e);
          setIsListening(false);
        }
      };

      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechPartialResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;
      Voice.onSpeechEnd = onSpeechEnd;

      if (!isAssistanceActive) {
        startListening();
      }

      return () => {
        isActive = false;
        Voice.destroy()
          .then(() => Voice.removeAllListeners())
          .catch((e) => console.warn('Voice destroy error:', e));
        setIsListening(false);
      };
    }, [isAssistanceActive, onStartAssistance])
  );

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

      {isAssistanceActive ? (
        <View pointerEvents="none" style={styles.aiOverlay}>
          <View style={[styles.aiBox, { top: '20%', left: '12%' }]} />
          <View style={[styles.aiBox, { top: '45%', left: '28%', width: 140 }]} />
          <Text style={styles.aiLabel}>AI assist overlay active</Text>
        </View>
      ) : (
        <View style={styles.bottomOverlay}>
          <View style={styles.listeningIndicator}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Ionicons name="mic" size={20} color="#FF3B30" />
            </Animated.View>
            <Text style={styles.listeningText}>Listening for 'Start'...</Text>
          </View>
          <TouchableOpacity
            style={styles.startButton}
            onPress={onStartAssistance}
            accessibilityLabel="Start Assistance"
            accessibilityHint="Activates the AI camera to detect objects"
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>START</Text>
          </TouchableOpacity>
        </View>
      )}
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
  bottomOverlay: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  listeningText: {
    color: '#FFF',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  startButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
});

