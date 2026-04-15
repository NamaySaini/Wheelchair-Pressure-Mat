import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.textCream,
        headerTitleStyle: { fontWeight: '600' },
        headerBackTitle: 'Settings',
      }}
    />
  );
}
