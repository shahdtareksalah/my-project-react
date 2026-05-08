import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { CreateAccountScreen } from '../screens/CreateAccountScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { EmergencyContactScreen } from '../screens/EmergencyContactScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ChildLocationScreen } from '../screens/ChildLocationScreen';
import { EmergencyScreen } from '../screens/EmergencyScreen';
import { CameraAssistanceScreen } from '../screens/CameraAssistanceScreen';
import { CameraScreen } from '../screens/CameraScreen';
import { ParentDashboardScreen } from '../screens/ParentDashboardScreen';
import { ParentDashboardLocationScreen } from '../screens/ParentDashboardLocationScreen';
import { AdminDashboardScreen } from '../screens/AdminDashboardScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { OCRScreen } from '../screens/OCRScreen';
import { LinkChildScreen } from '../screens/LinkChildScreen';
import { CreateSafeZoneScreen } from '../screens/CreateSafeZoneScreen';
import { colors } from '../theme/colors';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  CreateAccount: undefined;
  EmergencyContact: undefined;
  Home: undefined;
  ChildLocation: undefined;
  Emergency: undefined;
  Camera: undefined;
  CameraAssistance: undefined;
  OCR: { autoRead?: boolean } | undefined;
  ParentDashboard: undefined;
  ParentDashboardLocation: undefined;
  AdminDashboard: undefined;
  Settings: undefined;
  LinkChild: undefined;
  CreateSafeZone: { dependentId: string; dependentName?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
        <Stack.Screen name="EmergencyContact" component={EmergencyContactScreen} />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ contentStyle: { backgroundColor: colors.backgroundDark } }}
        />
        <Stack.Screen
          name="ChildLocation"
          component={ChildLocationScreen}
          options={{ contentStyle: { backgroundColor: colors.primaryDark } }}
        />
        <Stack.Screen name="Emergency" component={EmergencyScreen} />
        <Stack.Screen
          name="Camera"
          component={CameraScreen}
          options={{ contentStyle: { backgroundColor: colors.primaryDark } }}
        />
        <Stack.Screen
          name="CameraAssistance"
          component={CameraAssistanceScreen}
          options={{ contentStyle: { backgroundColor: colors.primaryDark } }}
        />
        <Stack.Screen
          name="OCR"
          component={OCRScreen}
          options={{ contentStyle: { backgroundColor: colors.primaryDark } }}
        />
        <Stack.Screen
          name="ParentDashboard"
          component={ParentDashboardScreen}
          options={{ contentStyle: { backgroundColor: colors.backgroundDark } }}
        />
        <Stack.Screen
          name="LinkChild"
          component={LinkChildScreen}
          options={{ contentStyle: { backgroundColor: colors.backgroundDark } }}
        />
        <Stack.Screen
          name="CreateSafeZone"
          component={CreateSafeZoneScreen}
          options={{ contentStyle: { backgroundColor: colors.backgroundDark } }}
        />
        <Stack.Screen
          name="ParentDashboardLocation"
          component={ParentDashboardLocationScreen}
          options={{ contentStyle: { backgroundColor: colors.backgroundDark } }}
        />
        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboardScreen}
          options={{ contentStyle: { backgroundColor: colors.backgroundDark } }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ contentStyle: { backgroundColor: colors.backgroundDark } }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
