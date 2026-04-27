import { Tabs } from 'expo-router';
import TabBar from '@/components/tab-bar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="caregiver" options={{ title: 'Caregiver' }} />
      <Tabs.Screen name="tracker" options={{ title: 'Tracker' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
