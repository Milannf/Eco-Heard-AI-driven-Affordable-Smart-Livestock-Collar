import { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Leaf } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, RADIUS, SHADOWS, SIZES } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'Email wajib diisi.';
    else if (!email.includes('@')) newErrors.email = 'Masukkan alamat email yang valid.';
    if (!password) newErrors.password = 'Kata sandi wajib diisi.';
    else if (password.length < 6) newErrors.password = 'Kata sandi minimal 6 karakter.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e) {
      setErrors(previous => ({ ...previous, submit: e.message }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.logoBox}>
              <Leaf size={28} color={COLORS.surface} />
            </View>
            <Text style={styles.appName}>AgriTrack</Text>
            <Text style={styles.tagline}>Smarter Livestock Management</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.title}>Selamat Datang Kembali</Text>
            <Text style={styles.subtitle}>
              Masuk ke profil lokal pada browser/perangkat ini.
            </Text>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Alamat Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="Masukkan email Anda"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(t) => { setEmail(t); setErrors(p => ({ ...p, email: undefined })); }}
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Kata Sandi</Text>
              </View>
              <View style={[styles.inputRow, errors.password && styles.inputError]}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder="Masukkan kata sandi Anda"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setErrors(p => ({ ...p, password: undefined })); }}
                />
                <Pressable
                  onPress={() => setShowPassword(p => !p)}
                  style={styles.eyeBtn}
                  hitSlop={8}
                >
                  {showPassword
                    ? <EyeOff size={20} color={COLORS.textLight} />
                    : <Eye size={20} color={COLORS.textLight} />}
                </Pressable>
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            {/* Sign In Button */}
            {!!errors.submit && <Text style={styles.errorText}>{errors.submit}</Text>}
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed, isLoading && styles.btnDisabled]}
              onPress={handleSignIn}
              disabled={isLoading}
            >
              <Text style={styles.primaryBtnText}>
                {isLoading ? 'Masuk...' : 'Masuk'}
              </Text>
            </Pressable>

            {/* Register link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerPrompt}>Belum punya akun? </Text>
              <Pressable onPress={() => router.push('/(auth)/register')}>
                <Text style={styles.registerLink}>Daftar</Text>
              </Pressable>
            </View>
          </View>
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
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SIZES.pagePadding,
    paddingTop: 32,
    paddingBottom: 32,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...SHADOWS.button,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 24,
    ...SHADOWS.card,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    marginBottom: 28,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  forgotText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: SIZES.inputHeight,
    backgroundColor: COLORS.veryLight,
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: SIZES.inputHeight,
    backgroundColor: COLORS.veryLight,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
  },
  inputFlex: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: COLORS.text,
  },
  eyeBtn: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 5,
    fontWeight: '500',
  },
  primaryBtn: {
    backgroundColor: COLORS.primaryDark,
    height: 54,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
    ...SHADOWS.button,
  },
  primaryBtnPressed: {
    backgroundColor: COLORS.primary,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerPrompt: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
