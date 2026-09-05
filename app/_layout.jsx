import { Stack } from 'expo-router';
import { COLORS } from '../constants/theme';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ 
      headerStyle: { backgroundColor: COLORS.background },
      headerTintColor: COLORS.primary,
      headerTitleStyle: { fontWeight: '700' },
      contentStyle: { backgroundColor: COLORS.background }
    }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="livestock/[id]" options={{ title: 'Detail Ternak' }} />
      <Stack.Screen name="add-livestock" options={{ title: 'Tambah Ternak', presentation: 'modal' }} />
      <Stack.Screen name="profile" options={{ title: 'Profil' }} />
    </Stack>
  );
}
