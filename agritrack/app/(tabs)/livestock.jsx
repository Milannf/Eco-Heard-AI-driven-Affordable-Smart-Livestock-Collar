import { useFocusEffect, useRouter } from 'expo-router';
import { Beef, ChevronRight, Plus, Search } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SHADOWS, SIZES } from '../../constants/theme';
import { MOCK_LIVESTOCK } from '../../data/livestock';

const FILTERS = ['All', 'Healthy', 'Needs Attention', 'Critical'];

function getStatusColors(status) {
  if (status === 'Healthy') return { color: COLORS.success, bg: COLORS.successBg };
  if (status === 'Needs Attention') return { color: COLORS.warning, bg: COLORS.warningBg };
  return { color: COLORS.danger, bg: COLORS.dangerBg };
}

export default function LivestockScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [livestockList, setLivestockList] = useState(MOCK_LIVESTOCK);

  useFocusEffect(
    useCallback(() => {
      setLivestockList([...MOCK_LIVESTOCK]);
    }, [])
  );

  const filteredData = livestockList.filter(item => {
    if (activeFilter !== 'All' && item.healthStatus !== activeFilter) return false;
    if (
      searchQuery &&
      !item.displayId.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !item.breed.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const renderItem = ({ item }) => {
    const { color, bg } = getStatusColors(item.healthStatus);
    const initials = item.displayId.replace('Cow #', '#');

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push(`/livestock/${item.id}`)}
      >
        <View style={styles.cardLayout}>
          {/* Colored initial box */}
          <View style={[styles.initBox, { backgroundColor: COLORS.softGreen }]}>
            <Beef size={20} color={COLORS.primary} />
          </View>

          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.tagId}>{item.displayId}</Text>
              <View style={[styles.badge, { backgroundColor: bg }]}>
                <Text style={[styles.badgeText, { color }]}>
                  {item.healthStatus === 'Needs Attention' ? 'Attention' : item.healthStatus}
                </Text>
              </View>
            </View>
            <Text style={styles.breed}>{item.breed} • {item.barn}</Text>
            <Text style={styles.details}>
              {item.temperature}°C • {item.activity} Activity
            </Text>
          </View>

          <ChevronRight size={18} color={COLORS.textMuted} />
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Livestock</Text>
            <Text style={styles.subtitle}>Manage and monitor your livestock.</Text>
          </View>
          <Pressable
            style={styles.addButton}
            onPress={() => router.push('/add-livestock')}
          >
            <Plus size={18} color={COLORS.surface} style={{ marginRight: 5 }} />
            <Text style={styles.addButtonText}>Add Livestock</Text>
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Search size={18} color={COLORS.textLight} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by ID or breed…"
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
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

      {/* ── List ── */}
      <FlatList
        data={filteredData}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Beef size={40} color={COLORS.border} />
            <Text style={styles.emptyText}>No livestock found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search or filter.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.background,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
    ...SHADOWS.button,
    marginTop: 4,
  },
  addButtonText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 13,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: SIZES.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: COLORS.text,
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
  listContent: {
    paddingHorizontal: SIZES.pagePadding,
    paddingTop: 10,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 10,
    ...SHADOWS.card,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardLayout: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  initBox: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.sm,
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
    alignItems: 'center',
    marginBottom: 3,
  },
  tagId: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  breed: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 5,
  },
  details: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
