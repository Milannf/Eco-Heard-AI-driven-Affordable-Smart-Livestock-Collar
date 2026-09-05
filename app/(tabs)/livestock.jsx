import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight, Plus, Search } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SIZES } from '../../constants/theme';
import { MOCK_LIVESTOCK } from '../../data/livestock';

const FILTERS = ['All', 'Healthy', 'Needs Attention', 'Critical'];

export default function LivestockScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [livestockList, setLivestockList] = useState(MOCK_LIVESTOCK);

  // Use focus effect to refresh data when returning from Add Livestock
  useFocusEffect(
    useCallback(() => {
      setLivestockList([...MOCK_LIVESTOCK]);
    }, [])
  );

  const filteredData = livestockList.filter(item => {
    if (activeFilter !== 'All' && item.healthStatus !== activeFilter) return false;
    if (searchQuery && !item.displayId.toLowerCase().includes(searchQuery.toLowerCase()) && !item.breed.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const renderItem = ({ item }) => {
    let statusColor = COLORS.success;
    let statusBg = COLORS.successBg;

    if (item.healthStatus === 'Needs Attention') {
      statusColor = COLORS.warning;
      statusBg = COLORS.warningBg;
    } else if (item.healthStatus === 'Critical') {
      statusColor = COLORS.danger;
      statusBg = COLORS.dangerBg;
    }

    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/livestock/${item.id}`)}
      >
        <View style={styles.cardLayout}>
          <View style={styles.imagePlaceholder} />

          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.tagId}>{item.displayId}</Text>
              <View style={[styles.badge, { backgroundColor: statusBg }]}>
                <Text style={[styles.badgeText, { color: statusColor }]}>{item.healthStatus}</Text>
              </View>
            </View>
            <Text style={styles.breed}>{item.breed} • {item.barn}</Text>

            <Text style={styles.details}>
              Temp {item.temperature}°C • Activity {item.activity}
            </Text>
          </View>

          <ChevronRight size={20} color={COLORS.border} />
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Livestock</Text>
            <Text style={styles.subtitle}>{livestockList.length} livestock • Barn B</Text>
          </View>
          <Pressable
            style={styles.addButton}
            onPress={() => router.push('/add-livestock')}
          >
            <Plus size={20} color={COLORS.surface} style={{ marginRight: 4 }} />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color={COLORS.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search livestock..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

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

      <FlatList
        data={filteredData}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
    padding: SIZES.pagePadding,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  title: {
    ...FONTS.screenTitle,
  },
  subtitle: {
    ...FONTS.body,
    color: COLORS.textLight,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
  },
  addButtonText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: SIZES.md,
    ...SHADOWS.card,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    ...FONTS.body,
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
  listContent: {
    padding: SIZES.pagePadding,
    paddingTop: 8,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 12,
    ...SHADOWS.card,
  },
  cardLayout: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.border,
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  tagId: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  breed: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 6,
  },
  details: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
  },
});
