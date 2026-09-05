import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { COLORS, FONTS, SIZES, RADIUS, SHADOWS } from '../../constants/theme';
import { MOCK_LIVESTOCK } from '../../data/livestock';

export default function LivestockDetailScreen() {
  const { id } = useLocalSearchParams();
  const livestock = MOCK_LIVESTOCK.find(l => l.id === id);
  const [activeTab, setActiveTab] = useState('Health');

  if (!livestock) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Livestock Data Not Found</Text>
      </View>
    );
  }

  let statusColor = COLORS.success;
  let statusBg = COLORS.successBg;
  
  if (livestock.healthStatus === 'Needs Attention') {
    statusColor = COLORS.warning;
    statusBg = COLORS.warningBg;
  } else if (livestock.healthStatus === 'Critical') {
    statusColor = COLORS.danger;
    statusBg = COLORS.dangerBg;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Text style={styles.title}>{livestock.displayId}</Text>
          <View style={[styles.badge, { backgroundColor: statusBg }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{livestock.healthStatus}</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>{livestock.breed} • Lactation {livestock.lactation || 0}</Text>

        <View style={styles.tabsContainer}>
          {['Health', 'Activity', 'Feed'].map(tab => (
            <Pressable 
              key={tab} 
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'Health' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Current Status</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Current Body Temperature</Text>
              <Text style={styles.statValue}>{livestock.temperature}°C</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Weight</Text>
              <Text style={styles.statValue}>{livestock.weight} kg</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Sex</Text>
              <Text style={styles.statValue}>{livestock.sex}</Text>
            </View>
            <View style={[styles.statRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.statLabel}>Age</Text>
              <Text style={styles.statValue}>{livestock.age}</Text>
            </View>

            <Pressable style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Call Veterinarian</Text>
            </Pressable>
          </View>
        )}

        {activeTab === 'Activity' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Activity Levels</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Current Activity</Text>
              <Text style={styles.statValue}>{livestock.activity}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Eating</Text>
              <Text style={styles.statValue}>4 hrs/day</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Resting</Text>
              <Text style={styles.statValue}>12 hrs/day</Text>
            </View>
            <View style={[styles.statRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.statLabel}>Inactive</Text>
              <Text style={styles.statValue}>8 hrs/day</Text>
            </View>
          </View>
        )}

        {activeTab === 'Feed' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Eco-AI Recommendation</Text>
            <Text style={styles.recommendationText}>
              Increase fresh forage and add mineral supplements to address the current {livestock.healthStatus.toLowerCase()} status. Ensure access to clean water.
            </Text>
            
            <View style={{marginTop: 16}}>
              <Text style={[styles.cardTitle, {fontSize: 14}]}>Feed Recommendation</Text>
              <Text style={styles.statLabel}>Fresh Forage: 70%</Text>
              <Text style={styles.statLabel}>Concentrate: 30%</Text>
            </View>
          </View>
        )}

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
    marginBottom: 4,
  },
  title: {
    ...FONTS.screenTitle,
  },
  subtitle: {
    ...FONTS.body,
    color: COLORS.textLight,
    marginBottom: SIZES.lg,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
  },
  badgeText: {
    fontWeight: '700',
    fontSize: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: SIZES.lg,
    ...SHADOWS.card,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  tabActive: {
    backgroundColor: COLORS.background,
  },
  tabText: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  tabTextActive: {
    color: COLORS.text,
  },
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statLabel: {
    ...FONTS.body,
    color: COLORS.textLight,
  },
  statValue: {
    ...FONTS.body,
    fontWeight: '600',
  },
  recommendationText: {
    ...FONTS.body,
    lineHeight: 22,
  },
  actionButton: {
    backgroundColor: COLORS.dangerBg,
    padding: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SIZES.lg,
  },
  actionButtonText: {
    color: COLORS.danger,
    fontWeight: '700',
    fontSize: 14,
  }
});
