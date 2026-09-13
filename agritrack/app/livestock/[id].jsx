import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { COLORS, FONTS, SIZES, RADIUS, SHADOWS } from '../../constants/theme';
import { MOCK_LIVESTOCK } from '../../data/livestock';
import {
  Thermometer,
  Weight,
  MapPin,
  Calendar,
  Activity,
  Beef,
  Phone,
} from 'lucide-react-native';

function getStatusColors(status) {
  if (status === 'Healthy') return { color: COLORS.success, bg: COLORS.successBg };
  if (status === 'Needs Attention') return { color: COLORS.warning, bg: COLORS.warningBg };
  return { color: COLORS.danger, bg: COLORS.dangerBg };
}

export default function LivestockDetailScreen() {
  const { id } = useLocalSearchParams();
  const livestock = MOCK_LIVESTOCK.find(l => l.id === id);
  const [activeTab, setActiveTab] = useState('Health');

  if (!livestock) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.notFoundContainer}>
          <Beef size={48} color={COLORS.border} />
          <Text style={styles.notFoundText}>Livestock not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { color: statusColor, bg: statusBg } = getStatusColors(livestock.healthStatus);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Card ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIconBox}>
              <Beef size={28} color={COLORS.primary} />
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroId}>{livestock.displayId}</Text>
              <Text style={styles.heroBreed}>{livestock.breed}</Text>
              <View style={styles.heroMeta}>
                <MapPin size={12} color={COLORS.textLight} style={{ marginRight: 4 }} />
                <Text style={styles.heroMetaText}>{livestock.barn}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {livestock.healthStatus}
              </Text>
            </View>
          </View>

          {/* Quick vitals row */}
          <View style={styles.vitalsRow}>
            <View style={styles.vitalItem}>
              <Thermometer size={14} color={COLORS.textLight} />
              <Text style={styles.vitalValue}>{livestock.temperature}°C</Text>
              <Text style={styles.vitalLabel}>Temp</Text>
            </View>
            <View style={styles.vitalDivider} />
            <View style={styles.vitalItem}>
              <Weight size={14} color={COLORS.textLight} />
              <Text style={styles.vitalValue}>{livestock.weight} kg</Text>
              <Text style={styles.vitalLabel}>Weight</Text>
            </View>
            <View style={styles.vitalDivider} />
            <View style={styles.vitalItem}>
              <Activity size={14} color={COLORS.textLight} />
              <Text style={styles.vitalValue}>{livestock.activity}</Text>
              <Text style={styles.vitalLabel}>Activity</Text>
            </View>
          </View>
        </View>

        {/* ── Tabs ── */}
        <View style={styles.tabBar}>
          {['Health', 'Activity', 'Feed'].map(tab => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Health Tab ── */}
        {activeTab === 'Health' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Health Details</Text>

            {[
              { label: 'Body Temperature', value: `${livestock.temperature}°C` },
              { label: 'Weight', value: `${livestock.weight} kg` },
              { label: 'Sex', value: livestock.sex },
              { label: 'Age', value: livestock.age },
              { label: 'Barn Location', value: livestock.barn },
              { label: 'Lactation', value: `${livestock.lactation || 0}` },
              { label: 'Last Updated', value: livestock.lastUpdated },
            ].map((row, idx, arr) => (
              <View
                key={row.label}
                style={[styles.statRow, idx === arr.length - 1 && { borderBottomWidth: 0 }]}
              >
                <Text style={styles.statLabel}>{row.label}</Text>
                <Text style={styles.statValue}>{row.value}</Text>
              </View>
            ))}

            <Pressable style={styles.veterinarianBtn}>
              <Phone size={16} color={COLORS.danger} style={{ marginRight: 8 }} />
              <Text style={styles.veterinarianText}>Call Veterinarian</Text>
            </Pressable>
          </View>
        )}

        {/* ── Activity Tab ── */}
        {activeTab === 'Activity' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Activity Levels</Text>
            {[
              { label: 'Current Activity', value: livestock.activity },
              { label: 'Eating', value: '4 hrs/day' },
              { label: 'Resting', value: '12 hrs/day' },
              { label: 'Inactive', value: '8 hrs/day' },
            ].map((row, idx, arr) => (
              <View
                key={row.label}
                style={[styles.statRow, idx === arr.length - 1 && { borderBottomWidth: 0 }]}
              >
                <Text style={styles.statLabel}>{row.label}</Text>
                <Text style={styles.statValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Feed Tab ── */}
        {activeTab === 'Feed' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Feed Recommendation</Text>
            <Text style={styles.feedRec}>
              Increase fresh forage and add mineral supplements to address the current{' '}
              <Text style={{ fontWeight: '600', color: statusColor }}>
                {livestock.healthStatus.toLowerCase()}
              </Text>{' '}
              status. Ensure access to clean water at all times.
            </Text>

            <View style={styles.feedBreakdown}>
              <Text style={styles.feedBreakdownTitle}>Daily Feed Breakdown</Text>
              {[
                { label: 'Fresh Forage', value: '70%', color: COLORS.primary },
                { label: 'Concentrate', value: '30%', color: COLORS.secondary },
              ].map(f => (
                <View key={f.label} style={styles.feedRow}>
                  <View style={[styles.feedDot, { backgroundColor: f.color }]} />
                  <Text style={styles.feedLabel}>{f.label}</Text>
                  <Text style={[styles.feedValue, { color: f.color }]}>{f.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SIZES.pagePadding,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  notFoundText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textLight,
  },

  // Hero
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    marginBottom: SIZES.md,
    ...SHADOWS.card,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  heroIconBox: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroInfo: { flex: 1 },
  heroId: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  heroBreed: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 3,
    marginBottom: 5,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroMetaText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  vitalsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.veryLight,
    borderRadius: RADIUS.md,
    padding: 14,
  },
  vitalItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  vitalDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  vitalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  vitalLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: SIZES.md,
    ...SHADOWS.card,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  tabActive: {
    backgroundColor: COLORS.primaryDark,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  tabTextActive: {
    color: COLORS.surface,
  },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: RADIUS.lg,
    ...SHADOWS.card,
  },
  cardTitle: {
    ...FONTS.cardTitle,
    marginBottom: SIZES.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Vet button
  veterinarianBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.dangerBg,
    padding: 14,
    borderRadius: RADIUS.md,
    marginTop: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },
  veterinarianText: {
    color: COLORS.danger,
    fontWeight: '700',
    fontSize: 14,
  },

  // Feed
  feedRec: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 20,
  },
  feedBreakdown: {
    backgroundColor: COLORS.veryLight,
    borderRadius: RADIUS.md,
    padding: 14,
  },
  feedBreakdownTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  feedLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  feedValue: {
    fontSize: 13,
    fontWeight: '700',
  },
});
