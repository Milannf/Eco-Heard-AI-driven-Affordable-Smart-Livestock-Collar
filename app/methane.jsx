import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SIZES, RADIUS, SHADOWS } from '../constants/theme';
import { CloudFog, ChevronRight, TrendingUp, TrendingDown, Info, Activity } from 'lucide-react-native';
import { MOCK_LIVESTOCK } from '../data/livestock';
import { useState } from 'react';

const PERIODS = ['Hari Ini', '7 Hari', '30 Hari'];

export default function MethaneScreen() {
  const [activePeriod, setActivePeriod] = useState('Hari Ini');

  const totalLivestock = MOCK_LIVESTOCK.length;
  const totalMethaneToday = MOCK_LIVESTOCK.reduce((acc, c) => acc + (c.methaneEmissionToday || 0), 0);
  const totalMethaneYesterday = MOCK_LIVESTOCK.reduce((acc, c) => acc + (c.methaneEmissionYesterday || 0), 0);
  const avgMethane = totalLivestock > 0 ? Math.round(totalMethaneToday / totalLivestock) : 0;
  
  const methaneChange = totalMethaneYesterday > 0 
    ? Math.round(((totalMethaneToday - totalMethaneYesterday) / totalMethaneYesterday) * 100) 
    : 0;

  // Sort livestock by highest emission
  const highestEmitters = [...MOCK_LIVESTOCK].sort((a, b) => 
    (b.methaneEmissionToday || 0) - (a.methaneEmissionToday || 0)
  );
  
  const topEmitter = highestEmitters[0];
  const highEmittersCount = highestEmitters.filter(c => (c.methaneEmissionToday || 0) > avgMethane).length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Summary Card ── */}
        <View style={[styles.card, { backgroundColor: COLORS.primaryDark }]}>
          <View style={styles.headerRow}>
            <View style={styles.iconBox}>
              <CloudFog size={24} color={COLORS.primaryDark} />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={styles.cardSubtitle}>Estimasi Total Emisi</Text>
              <Text style={styles.cardTitleWhite}>{totalMethaneToday} L</Text>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Rata-rata/Ternak</Text>
              <Text style={styles.statValue}>{avgMethane} L</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Perubahan</Text>
              <View style={styles.trendRow}>
                {methaneChange > 0 ? <TrendingUp size={14} color={COLORS.danger} /> : <TrendingDown size={14} color={COLORS.success} />}
                <Text style={[styles.statValue, { color: methaneChange > 0 ? COLORS.danger : COLORS.success, marginLeft: 4 }]}>
                  {methaneChange > 0 ? '+' : ''}{methaneChange}%
                </Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Tertinggi</Text>
              <Text style={styles.statValue}>{topEmitter?.displayId || '-'}</Text>
            </View>
          </View>
        </View>

        {/* ── Insight ── */}
        <View style={styles.insightBox}>
          <Info size={20} color={COLORS.primary} style={{ marginTop: 2 }} />
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>Wawasan Data Simulasi</Text>
            <Text style={styles.insightText}>
              {methaneChange > 0 
                ? 'Emisi metana diperkirakan meningkat dibandingkan kemarin. ' 
                : 'Emisi metana stabil atau menurun. '}
              Terdapat {highEmittersCount} ternak dengan estimasi emisi lebih tinggi dari rata-rata kelompok.
            </Text>
          </View>
        </View>

        {/* ── Trend Section ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Activity size={18} color={COLORS.text} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Tren Emisi (Data Simulasi)</Text>
          </View>
        </View>
        
        <View style={styles.trendCard}>
          {/* Filters */}
          <View style={styles.filterRow}>
            {PERIODS.map(period => (
              <Pressable
                key={period}
                style={[
                  styles.filterChip,
                  activePeriod === period && styles.filterChipActive,
                ]}
                onPress={() => setActivePeriod(period)}
              >
                <Text
                  style={[
                    styles.filterText,
                    activePeriod === period && styles.filterTextActive,
                  ]}
                >
                  {period}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Simple Mock Chart Visual */}
          <View style={styles.chartArea}>
             <View style={styles.chartBars}>
               {[0.6, 0.7, 0.65, 0.8, 0.75, 0.7, 0.9].map((height, i) => (
                 <View key={i} style={styles.chartBarCol}>
                   <View style={[styles.chartBar, { height: `${height * 100}%` }, i === 6 && { backgroundColor: COLORS.primaryDark }]} />
                 </View>
               ))}
             </View>
             <View style={styles.chartLabels}>
               <Text style={styles.chartLabel}>Sen</Text>
               <Text style={styles.chartLabel}>Sel</Text>
               <Text style={styles.chartLabel}>Rab</Text>
               <Text style={styles.chartLabel}>Kam</Text>
               <Text style={styles.chartLabel}>Jum</Text>
               <Text style={styles.chartLabel}>Sab</Text>
               <Text style={[styles.chartLabel, { color: COLORS.primaryDark, fontWeight: '700' }]}>Min</Text>
             </View>
          </View>
        </View>

        {/* ── Kontribusi Ternak ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Kontribusi Ternak</Text>
        </View>

        {highestEmitters.map((cattle, index) => {
          const isHighest = index === 0;
          return (
            <View key={cattle.id} style={styles.livestockRow}>
              <View style={[styles.rankBadge, isHighest && { backgroundColor: COLORS.dangerBg }]}>
                <Text style={[styles.rankText, isHighest && { color: COLORS.danger }]}>#{index + 1}</Text>
              </View>
              <View style={styles.livestockInfo}>
                <Text style={styles.cattleId}>{cattle.displayId}</Text>
                <Text style={styles.cattleBreed}>{cattle.breed}</Text>
              </View>
              <View style={styles.emissionCol}>
                <Text style={[styles.emissionValue, isHighest && { color: COLORS.danger }]}>
                  {cattle.methaneEmissionToday} L
                </Text>
                <Text style={styles.emissionSub}>Estimasi</Text>
              </View>
            </View>
          );
        })}

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
    paddingHorizontal: SIZES.pagePadding,
    paddingTop: SIZES.md,
  },
  card: {
    borderRadius: RADIUS.xl,
    padding: 20,
    marginBottom: SIZES.lg,
    ...SHADOWS.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerTextCol: {
    flex: 1,
  },
  cardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  cardTitleWhite: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.surface,
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.md,
    padding: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.surface,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  insightBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.veryLight,
    borderWidth: 1,
    borderColor: COLORS.softGreen,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: SIZES.lg,
  },
  insightContent: {
    flex: 1,
    marginLeft: 12,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginBottom: 4,
  },
  insightText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },

  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    ...FONTS.sectionTitle,
  },

  trendCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: SIZES.lg,
    ...SHADOWS.card,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: COLORS.veryLight,
    padding: 4,
    borderRadius: RADIUS.md,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  filterChipActive: {
    backgroundColor: COLORS.surface,
    ...SHADOWS.button,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  filterTextActive: {
    color: COLORS.text,
  },

  chartArea: {
    height: 160,
    marginTop: 10,
  },
  chartBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chartBarCol: {
    width: 24,
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    backgroundColor: COLORS.secondary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 8,
  },
  chartLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    width: 24,
    textAlign: 'center',
  },

  livestockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: RADIUS.lg,
    marginBottom: 10,
    ...SHADOWS.card,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.veryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textLight,
  },
  livestockInfo: { flex: 1 },
  cattleId: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  cattleBreed: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  emissionCol: {
    alignItems: 'flex-end',
  },
  emissionValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  emissionSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
