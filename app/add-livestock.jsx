import { View, Text, StyleSheet, SafeAreaView, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { COLORS, FONTS, SIZES, RADIUS, SHADOWS } from '../constants/theme';
import { MOCK_LIVESTOCK } from '../data/livestock';

export default function AddLivestockScreen() {
  const router = useRouter();
  
  const [tagId, setTagId] = useState('');
  const [breed, setBreed] = useState('');
  const [barn, setBarn] = useState('');
  const [weight, setWeight] = useState('');

  const handleSave = () => {
    if (!tagId || !breed) {
      Alert.alert('Validation Error', 'Livestock ID and Breed are required.');
      return;
    }

    const newCow = {
      id: Math.random().toString(),
      displayId: tagId,
      breed: breed,
      barn: barn || 'Barn A',
      weight: weight ? parseInt(weight) : 500,
      temperature: 38.5,
      activity: 'Normal',
      healthStatus: 'Healthy',
      sex: 'Female',
      age: '3 years',
      lactation: 1,
      lastUpdated: 'Just now',
    };

    MOCK_LIVESTOCK.unshift(newCow);
    
    Alert.alert('Success', 'Livestock added successfully.', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{flex: 1}}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>Livestock Tag / ID</Text>
          <TextInput 
            style={styles.input}
            placeholder="e.g. Cow #046"
            placeholderTextColor={COLORS.textLight}
            value={tagId}
            onChangeText={setTagId}
          />

          <Text style={styles.label}>Breed</Text>
          <TextInput 
            style={styles.input}
            placeholder="e.g. Brahman Cross"
            placeholderTextColor={COLORS.textLight}
            value={breed}
            onChangeText={setBreed}
          />

          <Text style={styles.label}>Barn</Text>
          <TextInput 
            style={styles.input}
            placeholder="e.g. Barn A"
            placeholderTextColor={COLORS.textLight}
            value={barn}
            onChangeText={setBarn}
          />
          
          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput 
            style={styles.input}
            placeholder="e.g. 500"
            keyboardType="numeric"
            placeholderTextColor={COLORS.textLight}
            value={weight}
            onChangeText={setWeight}
          />

          <Pressable style={styles.button} onPress={handleSave}>
            <Text style={styles.buttonText}>Save Livestock</Text>
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
    padding: SIZES.pagePadding,
  },
  label: {
    ...FONTS.body,
    fontWeight: '600',
    marginBottom: 8,
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.md,
    borderRadius: RADIUS.md,
    marginBottom: SIZES.lg,
    ...FONTS.body,
  },
  button: {
    backgroundColor: COLORS.primaryDark,
    padding: 16,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    marginTop: SIZES.xs,
    ...SHADOWS.card,
  },
  buttonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: '600',
  }
});
