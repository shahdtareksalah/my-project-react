import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SafetyProvider } from './src/context/SafetyContext';
import { CallProvider } from './src/context/CallContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafetyProvider>
        <CallProvider>
          <AppNavigator />
        </CallProvider>
      </SafetyProvider>
    </SafeAreaProvider>
  );
}
