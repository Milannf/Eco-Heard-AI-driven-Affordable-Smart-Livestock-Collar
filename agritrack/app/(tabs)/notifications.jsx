import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SIZES, RADIUS, SHADOWS } from '../../constants/theme';
import { HeartPulse, Activity, Bell, FileText, CheckCheck } from 'lucide-react-native';
import { MOCK_NOTIFICATIONS } from '../../data/livestock';

const FILTERS = ['All', 'Health', 'Activity', 'System'];

function getNotifStyle(type) {
  switch (type) {
    case 'Health':
      return { icon: <HeartPulse size={18} color={COLORS.danger} />, bg: COLORS.dangerBg, accent: COLORS.danger };
    case 'Activity':
      return { icon: <Activity size={18} color={COLORS.warning} />, bg: COLORS.warningBg, accent: COLORS.warning };
    case 'System':
      return { icon: <FileText size={18} color={COLORS.primary} />, bg: COLORS.successBg, accent: COLORS.primary };
    default:
      return { icon: <Bell size={18} color={COLORS.textLight} />, bg: COLORS.border, accent: COLORS.textLight };
  }
}

export default function NotificationsScreen() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredData = notifications.filter(item =>
    activeFilter === 'All' || item.type === activeFilter
  );

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>Stay updated on your livestock.</Text>
          </View>
          {unreadCount > 0 && (
            <Pressable style={styles.markReadBtn} onPress={markAllRead}>
              <CheckCheck size={14} color={COLORS.primary} style={{ marginRight: 5 }} />
              <Text style={styles.markReadText}>Mark all read</Text>
            </Pressable>
          )}
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {FILTERS.map(filter => (
              <Pressable
                key={filter}
                style={[
                  styles.filterChip,
                  activeFilter === filter && styles.filterChipActive,
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === filter && styles.filterTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* ── Notification list ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredData.length === 0 && (
          <View style={styles.emptyState}>
            <Bell size={40} color={COLORS.border} />
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        )}

        {filteredData.map(item => {
          const { icon, bg, accent } = getNotifStyle(item.type);
          return (
            <Pressable
              key={item.id}
              style={[styles.card, !item.isRead && styles.cardUnread]}
            >
              {/* Unread left accent bar */}
              {!item.isRead && (
                <View style={[styles.unreadBar, { backgroundColor: accent }]} />
              )}

              <View style={[styles.iconBox, { backgroundColor: bg }]}>{icon}</View>

              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <Text style={[styles.cardTitle, { color: accent }]}>{item.title}</Text>
                  <Text style={styles.timeText}>{item.time}</Text>
                </View>
                <Text style={styles.messageText}>{item.message}</Text>
              </View>
            </Pressable>
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
  header: {
    paddingHorizontal: SIZES.pagePadding,
    paddingTop: SIZES.sm,
    paddingBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.md,
  },
  title: {
    ...FONTS.screenTitle,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 3,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.round,
    marginTop: 6,
  },
  markReadText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  filterRow: {
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.surface,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  filterTextActive: {
    color: COLORS.surface,
  },
  scrollContent: {
    paddingHorizontal: SIZES.pagePadding,
    paddingTop: 10,
    paddingBottom: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 10,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  cardUnread: {
    backgroundColor: COLORS.veryLight,
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: RADIUS.lg,
    borderBottomLeftRadius: RADIUS.lg,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginLeft: 6,
  },
  cardContent: { flex: 1 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    flexShrink: 0,
  },
  messageText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 19,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textLight,
  },
});
