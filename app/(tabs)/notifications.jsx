import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { useState } from 'react';
import { COLORS, FONTS, SIZES, RADIUS, SHADOWS } from '../../constants/theme';
import { HeartPulse, Activity, Bell, FileText } from 'lucide-react-native';
import { MOCK_NOTIFICATIONS } from '../../data/livestock';

const FILTERS = ['All', 'Health', 'Activity', 'System'];

export default function NotificationsScreen() {
  const [activeFilter, setActiveFilter] = useState('All');

  const getIcon = (type) => {
    switch(type) {
      case 'Health': return <HeartPulse size={20} color={COLORS.danger} />;
      case 'Activity': return <Activity size={20} color={COLORS.warning} />;
      case 'System': return <FileText size={20} color={COLORS.primary} />;
      default: return <Bell size={20} color={COLORS.textLight} />;
    }
  };

  const getIconBg = (type) => {
    switch(type) {
      case 'Health': return COLORS.dangerBg;
      case 'Activity': return COLORS.warningBg;
      case 'System': return COLORS.successBg;
      default: return COLORS.border;
    }
  };

  const filteredData = MOCK_NOTIFICATIONS.filter(item => 
    activeFilter === 'All' || item.type === activeFilter
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {FILTERS.map(filter => (
              <Pressable 
                key={filter} 
                style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                  {filter}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredData.map(item => (
          <Pressable 
            key={item.id} 
            style={[styles.card, !item.isRead && styles.cardUnread]}
          >
            <View style={[styles.iconBox, { backgroundColor: getIconBg(item.type) }]}>
              {getIcon(item.type)}
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.timeText}>{item.time}</Text>
              </View>
              <Text style={styles.messageText}>{item.message}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SIZES.pagePadding,
    paddingBottom: 8,
  },
  title: {
    ...FONTS.screenTitle,
    marginBottom: SIZES.md,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: SIZES.sm,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.border,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryDark,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterTextActive: {
    color: COLORS.surface,
  },
  scrollContent: {
    padding: SIZES.pagePadding,
    paddingTop: 8,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.card,
  },
  cardUnread: {
    backgroundColor: '#F2F6ED',
    borderColor: 'rgba(63, 98, 40, 0.1)',
    borderWidth: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
    letterSpacing: 0.5,
  },
  timeText: {
    ...FONTS.caption,
  },
  messageText: {
    ...FONTS.body,
    color: COLORS.text,
    lineHeight: 20,
  }
});
