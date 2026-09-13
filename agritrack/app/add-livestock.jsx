import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { COLORS, FONTS, SIZES, RADIUS, SHADOWS } from '../constants/theme';
import { MOCK_LIVESTOCK } from '../data/livestock';

const SEX_OPTIONS = ['Female', 'Male'];
const HEALTH_OPTIONS = ['Healthy', 'Needs Attention', 'Critical'];
const BARN_OPTIONS = ['Barn A', 'Barn B', 'Barn C'];

function OptionSelector({ label, options, selected, onSelect }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map(opt => (
          <Pressable
            key={opt}
            style={[styles.optionChip, selected === opt && styles.optionChipActive]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[styles.optionText, selected === opt && styles.optionTextActive]}>
              {opt}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function AddLivestockScreen() {
  const router = useRouter();

  const [tagId, setTagId] = useState('');
  const [breed, setBreed] = useState('');
  const [barn, setBarn] = useState('Barn A');
  const [weight, setWeight] = useState('');
  const [sex, setSex] = useState('Female');
  const [healthStatus, setHealthStatus] = useState('Healthy');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!tagId.trim()) newErrors.tagId = 'Livestock ID is required.';
    if (!breed.trim()) newErrors.breed = 'Breed is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const newCow = {
      id: Math.random().toString(36).slice(2, 8),
      displayId: tagId.trim(),
      breed: breed.trim(),
      barn,
      weight: weight ? parseInt(weight, 10) : 500,
      temperature: 38.5,
      activity: 'Normal',
      healthStatus,
      sex,
      age: 'Unknown',
      lactation: 0,
      lastUpdated: 'Just now',
    };

    MOCK_LIVESTOCK.unshift(newCow);

    Alert.alert('Livestock Added', `${tagId} has been added successfully.`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionHeading}>Basic Information</Text>

          {/* Livestock ID */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Livestock ID *</Text>
            <TextInput
              style={[styles.input, errors.tagId && styles.inputError]}
              placeholder="e.g. Cow #046"
              placeholderTextColor={COLORS.textMuted}
              value={tagId}
              onChangeText={t => { setTagId(t); setErrors(p => ({ ...p, tagId: undefined })); }}
            />
            {errors.tagId ? <Text style={styles.errorText}>{errors.tagId}</Text> : null}
          </View>

          {/* Breed */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Breed *</Text>
            <TextInput
              style={[styles.input, errors.breed && styles.inputError]}
              placeholder="e.g. Brahman Cross"
              placeholderTextColor={COLORS.textMuted}
              value={breed}
              onChangeText={t => { setBreed(t); setErrors(p => ({ ...p, breed: undefined })); }}
            />
            {errors.breed ? <Text style={styles.errorText}>{errors.breed}</Text> : null}
          </View>

          {/* Weight */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 520"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
            />
          </View>

          <Text style={[styles.sectionHeading, { marginTop: 8 }]}>Classification</Text>

          <OptionSelector
            label="Barn Location"
            options={BARN_OPTIONS}
            selected={barn}
            onSelect={setBarn}
          />

          <OptionSelector
            label="Sex"
            options={SEX_OPTIONS}
            selected={sex}
            onSelect={setSex}
          />

          <OptionSelector
            label="Initial Health Status"
            options={HEALTH_OPTIONS}
            selected={healthStatus}
            onSelect={setHealthStatus}
          />

          {/* CTA */}
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleSave}
          >
            <Text style={styles.buttonText}>Add Livestock</Text>
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SIZES.pagePadding,
    paddingTop: SIZES.md,
    paddingBottom: 32,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textLight,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: SIZES.md,
    marginTop: 4,
  },
  fieldGroup: {
    marginBottom: SIZES.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    height: SIZES.inputHeight,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    fontSize: 15,
    color: COLORS.text,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 5,
    fontWeight: '500',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  optionChipActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  optionTextActive: {
    color: COLORS.surface,
  },
  button: {
    backgroundColor: COLORS.primaryDark,
    height: 54,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.lg,
    ...SHADOWS.button,
  },
  buttonPressed: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textLight,
  },
});
