import { View, Text, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { COLORS, FONTS, SIZES, RADIUS, SHADOWS } from '../constants/theme';
import { User } from 'lucide-react-native';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarPlaceholder}>
            <User size={32} color={COLORS.surface} />
          </View>
          <View>
            <Text style={styles.name}>Pak Tani</Text>
            <Text style={styles.subtitle}>Livestock Farmer</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Pressable style={styles.menuItem}>
            <Text style={styles.menuText}>Account Settings</Text>
          </Pressable>
          <Pressable style={styles.menuItem}>
            <Text style={styles.menuText}>User Guide</Text>
          </Pressable>
          <Pressable style={[styles.menuItem, { borderBottomWidth: 0 }]}>
            <Text style={[styles.menuText, { color: COLORS.danger }]}>Sign Out</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SIZES.pagePadding,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.xxl,
    marginTop: SIZES.md,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryDark,
    marginRight: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...FONTS.screenTitle,
    fontSize: 24,
  },
  subtitle: {
    ...FONTS.body,
    color: COLORS.textLight,
    marginTop: 4,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  menuItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuText: {
    ...FONTS.body,
    fontWeight: '500',
  }
});
