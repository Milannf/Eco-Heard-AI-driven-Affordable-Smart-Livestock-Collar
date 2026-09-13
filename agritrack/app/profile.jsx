import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  User,
  Home,
  Bell,
  Info,
  ChevronRight,
  LogOut,
  Shield,
  Phone,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, SIZES, RADIUS, SHADOWS } from '../constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [healthAlerts, setHealthAlerts] = useState(true);
  const [activityAlerts, setActivityAlerts] = useState(true);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of AgriTrack?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'PT';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Header ── */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.name || 'Farmer'}</Text>
          <Text style={styles.role}>{user?.role || 'Livestock Farmer'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
        </View>

        {/* ── Personal Info ── */}
        <Text style={styles.sectionLabel}>PERSONAL INFORMATION</Text>
        <View style={styles.menuCard}>
          <InfoRow icon={<User size={16} color={COLORS.primary} />} label="Full Name" value={user?.name || '—'} />
          <InfoRow icon={<Phone size={16} color={COLORS.primary} />} label="Phone" value={user?.phone || '—'} last />
        </View>

        {/* ── Farm Info ── */}
        <Text style={styles.sectionLabel}>FARM DETAILS</Text>
        <View style={styles.menuCard}>
          <InfoRow icon={<Home size={16} color={COLORS.primary} />} label="Farm Name" value={user?.farmName || '—'} />
          <InfoRow icon={<Shield size={16} color={COLORS.primary} />} label="Location" value={user?.location || '—'} last />
        </View>

        {/* ── Notification Preferences ── */}
        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <View style={styles.menuCard}>
          <ToggleRow
            label="Health Alerts"
            subtitle="Get alerts for health events"
            value={healthAlerts}
            onToggle={setHealthAlerts}
          />
          <ToggleRow
            label="Activity Alerts"
            subtitle="Low activity notifications"
            value={activityAlerts}
            onToggle={setActivityAlerts}
            last
          />
        </View>

        {/* ── About ── */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.menuCard}>
          <MenuRow icon={<Info size={16} color={COLORS.primary} />} label="About AgriTrack" />
          <MenuRow icon={<Shield size={16} color={COLORS.primary} />} label="Privacy Policy" last />
        </View>

        {/* ── Sign Out ── */}
        <Pressable
          style={({ pressed }) => [styles.signOutBtn, pressed && styles.signOutBtnPressed]}
          onPress={handleSignOut}
        >
          <LogOut size={18} color={COLORS.danger} style={{ marginRight: 10 }} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        <Text style={styles.version}>AgriTrack v1.0.0</Text>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ──

function InfoRow({ icon, label, value, last }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

function MenuRow({ icon, label, last }) {
  return (
    <Pressable style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={[styles.rowValue, { flex: 1 }]}>{label}</Text>
      <ChevronRight size={16} color={COLORS.textMuted} />
    </Pressable>
  );
}

function ToggleRow({ label, subtitle, value, onToggle, last }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={[styles.rowIcon]}>
        <Bell size={16} color={COLORS.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowValue}>{label}</Text>
        <Text style={styles.rowLabel}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.border, true: COLORS.secondary }}
        thumbColor={value ? COLORS.primary : COLORS.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: SIZES.pagePadding,
    paddingTop: SIZES.md,
  },

  // Profile header
  profileHeader: {
    alignItems: 'center',
    paddingVertical: SIZES.lg,
    marginBottom: SIZES.md,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...SHADOWS.card,
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.surface,
    letterSpacing: -0.5,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  role: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
    marginBottom: 4,
  },
  email: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // Section labels
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
    paddingLeft: 4,
  },

  // Menu cards
  menuCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SIZES.md,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 54,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.veryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowContent: { flex: 1 },
  rowLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: RADIUS.lg,
    height: 52,
    marginBottom: SIZES.md,
    marginTop: 4,
  },
  signOutBtnPressed: {
    opacity: 0.75,
  },
  signOutText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '700',
  },

  version: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
});
