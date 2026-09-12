import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { COLORS } from '../constants/theme';
import { AuthProvider, useAuth } from '../context/AuthContext';

// Guard: redirect based on auth state
function AuthGate() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === '(auth)';
    const inTabs = segments[0] === '(tabs)';

    if (!user && !inAuth) {
      // Not authenticated → redirect to login
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      // Already authenticated → go to app
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.primaryDark,
          headerTitleStyle: { fontWeight: '700', color: COLORS.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="livestock/[id]"
          options={{
            title: 'Detail Ternak',
            headerBackTitle: 'Kembali',
          }}
        />
        <Stack.Screen
          name="add-livestock"
          options={{
            title: 'Tambah Ternak',
            presentation: 'modal',
            headerBackTitle: 'Batal',
          }}
        />
        <Stack.Screen
          name="methane"
          options={{
            title: 'Monitoring Emisi',
            headerBackTitle: 'Kembali',
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            title: 'Profil',
            headerBackTitle: 'Kembali',
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
