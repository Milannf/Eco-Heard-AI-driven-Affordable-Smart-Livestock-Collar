import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';
import { Home, Beef, FileText, Bell } from 'lucide-react-native';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.tabActive,
        tabBarInactiveTintColor: COLORS.tabInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -2,
        },
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom + 10,
          paddingTop: 10,
          shadowColor: '#183D2B',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="livestock"
        options={{
          title: 'Ternak',
          tabBarIcon: ({ color }) => <Beef size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Laporan',
          tabBarIcon: ({ color }) => <FileText size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifikasi',
          tabBarIcon: ({ color }) => <Bell size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
