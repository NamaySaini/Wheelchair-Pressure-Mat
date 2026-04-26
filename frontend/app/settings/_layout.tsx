import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#f6fafd' },
        headerTintColor: '#351601',
        headerTitleStyle: { fontWeight: '700', color: '#351601' },
        headerShadowVisible: false,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 8 }}>
            <Ionicons name="chevron-back" size={24} color="#351601" />
          </TouchableOpacity>
        ),
      }}
    />
  );
}
