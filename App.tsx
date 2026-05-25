import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SafetyProvider } from './src/context/SafetyContext';
import { CallProvider } from './src/context/CallContext';
import { NotificationsProvider } from './src/context/NotificationsContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafetyProvider>
        <NotificationsProvider>
          <CallProvider>
            <AppNavigator />
          </CallProvider>
        </NotificationsProvider>
      </SafetyProvider>
    </SafeAreaProvider>
  );
}
