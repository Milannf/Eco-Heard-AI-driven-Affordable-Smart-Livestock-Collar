import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONTS, SIZES, RADIUS, SHADOWS } from '../../constants/theme';
import { Bell, User, TriangleAlert, PawPrint, HeartPulse, ChevronRight, Leaf } from 'lucide-react-native';
import { MOCK_LIVESTOCK } from '../../data/livestock';

export default function DashboardScreen() {
  const router = useRouter();

  // Dynamic KPIs from centralized mock data
  const totalLivestock = MOCK_LIVESTOCK.length;
  const healthyCount = MOCK_LIVESTOCK.filter(c => c.healthStatus === 'Healthy').length;
  const attentionCount = MOCK_LIVESTOCK.filter(c => c.healthStatus === 'Needs Attention').length;
  const criticalCount = MOCK_LIVESTOCK.filter(c => c.healthStatus === 'Critical').length;
  const healthPercentage = totalLivestock > 0 ? Math.round((healthyCount / totalLivestock) * 100) : 0;
  
  const needsAttentionCattle = MOCK_LIVESTOCK.filter(c => c.healthStatus === 'Needs Attention' || c.healthStatus === 'Critical').slice(0, 2);
  const criticalCattle = MOCK_LIVESTOCK.find(c => c.healthStatus === 'Critical') || needsAttentionCattle[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => router.push('/profile')} style={styles.avatar}>
              <User size={20} color={COLORS.surface} />
            </Pressable>
            <View>
              <Text style={styles.greeting}>Good evening, Pak Tani</Text>
              <Text style={styles.location}>Barn B • Bogor</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable onPress={() => router.push('/notifications')} style={styles.iconButton}>
              <Bell size={22} color={COLORS.primaryDark} />
              <View style={styles.badgeIndicator} />
            </Pressable>
          </View>
        </View>

        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Livestock Overview</Text>
          <Text style={styles.introSubtitle}>Here's how your livestock is doing today.</Text>
        </View>

        {/* Critical Alert Banner */}
        {criticalCattle && (
          <Pressable 
            style={styles.alertBanner} 
            onPress={() => router.push(`/livestock/${criticalCattle.id}`)}
          >
            <View style={styles.alertIcon}>
              <TriangleAlert size={20} color={COLORS.warning} />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>NEEDS ATTENTION</Text>
              <Text style={styles.alertDesc}>{criticalCattle.displayId} has shown {criticalCattle.activity.toLowerCase()} activity.</Text>
            </View>
            <ChevronRight size={20} color={COLORS.warning} />
          </Pressable>
        )}

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCardMain}>
            <View style={styles.kpiHeader}>
              <View style={[styles.kpiIconBox, { backgroundColor: COLORS.successBg }]}>
                <PawPrint size={18} color={COLORS.success} />
              </View>
              <Text style={styles.kpiLabel}>TOTAL LIVESTOCK</Text>
            </View>
            <Text style={styles.kpiValueMain}>{totalLivestock}</Text>
          </View>
          <View style={styles.kpiCol}>
            <View style={styles.kpiCardSmall}>
              <View style={styles.kpiHeader}>
                <HeartPulse size={14} color={COLORS.success} style={{marginRight: 6}}/>
                <Text style={styles.kpiLabelSmall}>HERD HEALTH</Text>
              </View>
              <Text style={styles.kpiValueSmall}>{healthPercentage}%</Text>
            </View>
            <View style={styles.kpiCardSmall}>
              <View style={styles.kpiHeader}>
                <TriangleAlert size={14} color={COLORS.warning} style={{marginRight: 6}}/>
                <Text style={styles.kpiLabelSmall}>ATTENTION</Text>
              </View>
              <Text style={[styles.kpiValueSmall, { color: COLORS.warning }]}>{attentionCount + criticalCount}</Text>
            </View>
          </View>
        </View>

        {/* Health Status Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Herd Health Summary</Text>
          <View style={styles.healthStatsRow}>
            <View style={styles.healthStatItem}>
              <Text style={[styles.healthStatLabel, { color: COLORS.success }]}>Healthy</Text>
              <Text style={styles.healthStatValue}>{healthyCount}</Text>
            </View>
            <View style={styles.healthStatItem}>
              <Text style={[styles.healthStatLabel, { color: COLORS.warning }]}>Needs Attention</Text>
              <Text style={styles.healthStatValue}>{attentionCount}</Text>
            </View>
            <View style={styles.healthStatItem}>
              <Text style={[styles.healthStatLabel, { color: COLORS.danger }]}>Critical</Text>
              <Text style={styles.healthStatValue}>{criticalCount}</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressSegment, { flex: healthyCount || 1, backgroundColor: COLORS.success }]} />
            <View style={[styles.progressSegment, { flex: attentionCount || 0.1, backgroundColor: COLORS.warning }]} />
            <View style={[styles.progressSegment, { flex: criticalCount || 0.1, backgroundColor: COLORS.danger }]} />
          </View>
        </View>

        {/* Needs Attention List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Needs Attention</Text>
          <Pressable onPress={() => router.push('/livestock')}>
            <Text style={styles.linkText}>View All</Text>
          </Pressable>
        </View>

        {needsAttentionCattle.map(cattle => (
          <Pressable 
            key={cattle.id}
            style={styles.compactCard}
            onPress={() => router.push(`/livestock/${cattle.id}`)}
          >
            <View style={styles.compactCardContent}>
              <View>
                <Text style={styles.cattleTag}>{cattle.displayId}</Text>
                <Text style={styles.cattleBreed}>{cattle.breed}</Text>
                <Text style={styles.cattleDetails}>{cattle.temperature}°C • {cattle.activity} Activity</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: cattle.healthStatus === 'Needs Attention' ? COLORS.warningBg : COLORS.dangerBg }]}>
                <Text style={[styles.statusText, { color: cattle.healthStatus === 'Needs Attention' ? COLORS.warning : COLORS.danger }]}>
                  {cattle.healthStatus}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={COLORS.border} />
          </Pressable>
        ))}

        {/* Feed Recommendation */}
        <View style={[styles.card, styles.recommendationCard]}>
          <View style={styles.recommendationHeader}>
            <View style={styles.leafIconBox}>
              <Leaf size={18} color={COLORS.earth} />
            </View>
            <Text style={styles.cardTitle}>Feed Recommendation</Text>
          </View>
          <Text style={styles.recommendationTitle}>Fresh Forage + Concentrate</Text>
          <Text style={styles.recommendationDesc}>Recommended for today's herd condition to maintain optimal health and milk yield.</Text>
        </View>
        
        <View style={{height: 20}} />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.lg,
    paddingTop: SIZES.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  greeting: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.text,
  },
  location: {
    ...FONTS.caption,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  badgeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
    borderWidth: 1,
    borderColor: COLORS.background,
  },
  introSection: {
    marginBottom: SIZES.md,
  },
  introTitle: {
    ...FONTS.screenTitle,
  },
  introSubtitle: {
    ...FONTS.body,
    color: COLORS.textLight,
    marginTop: 4,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningBg,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: SIZES.lg,
    borderWidth: 1,
    borderColor: 'rgba(200, 134, 24, 0.2)',
  },
  alertIcon: {
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.warning,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  alertDesc: {
    ...FONTS.body,
    color: COLORS.text,
    lineHeight: 20,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.lg,
  },
  kpiCardMain: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOWS.card,
  },
  kpiCol: {
    width: '48%',
    justifyContent: 'space-between',
  },
  kpiCardSmall: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 8,
    ...SHADOWS.card,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  kpiLabelSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  kpiValueMain: {
    ...FONTS.kpi,
  },
  kpiValueSmall: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 20,
    marginBottom: SIZES.lg,
    ...SHADOWS.card,
  },
  cardTitle: {
    ...FONTS.cardTitle,
    marginBottom: 12,
  },
  healthStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  healthStatItem: {
    alignItems: 'center',
  },
  healthStatLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  healthStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  progressBar: {
    height: 8,
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressSegment: {
    height: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    ...FONTS.sectionTitle,
  },
  linkText: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.primary,
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.card,
  },
  compactCardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
  },
  cattleTag: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  cattleBreed: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
    marginBottom: 6,
  },
  cattleDetails: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recommendationCard: {
    backgroundColor: COLORS.earthBg,
    borderColor: 'rgba(155, 93, 54, 0.15)',
    borderWidth: 1,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  leafIconBox: {
    marginRight: 8,
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.earth,
    marginBottom: 6,
  },
  recommendationDesc: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  }
});
