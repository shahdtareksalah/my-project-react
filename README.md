# SmartAid – React Native App

AI-powered assistance app for child safety and monitoring (parent dashboard, location, emergency, camera assistance, admin console).

## Run the app

```bash
cd SmartAid
npm install   # if needed
npx expo start
```

Then press **i** for iOS simulator or **a** for Android emulator, or scan the QR code with Expo Go on a device.

## Screens

- **Auth:** Login, Create Account, Emergency Contact Setup  
- **Home:** Welcome, child status, Camera Assistance / Child Location / Emergency cards, quick tip  
- **Child Location:** Safe status, map placeholder, location detail, Call Child / Send Alert  
- **Emergency:** Large emergency button, “Back to Home”  
- **Camera Assistance:** Camera active badge, device frame, START / DESCRIBE / READ  
- **Parent Dashboard:** Child profile, safe zone & emergency contact inputs, Call Child / View Full Map  
- **Parent Dashboard (Location):** Last known location map, safe zone settings  
- **Admin Dashboard:** Metric cards, AI Detection Events chart, system logs (Critical / Info / Success / Warning)  
- **Settings:** Dashboards (Admin, Parents), Account (Notifications, Privacy), Support, Log Out, version  

## Tech

- **Expo** (React Native)
- **React Navigation** (native stack)
- **@expo/vector-icons** (Ionicons)
- **TypeScript**

## Project layout

- `App.tsx` – Entry, status bar, `AppNavigator`
- `src/navigation/AppNavigator.tsx` – Root stack and screen list
- `src/theme/colors.ts` – App colors
- `src/components/` – Card, Button, Input
- `src/screens/` – One file per screen
