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
import { COLORS, RADIUS, SHADOWS, SIZES } from '../../constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    farmName: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const updateField = (key, value) => {
    setForm(p => ({ ...p, [key]: value }));
    setErrors(p => ({ ...p, [key]: undefined }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Nama lengkap wajib diisi.';
    if (!form.email.trim()) newErrors.email = 'Email wajib diisi.';
    else if (!form.email.includes('@')) newErrors.email = 'Masukkan alamat email yang valid.';
    if (!form.password) newErrors.password = 'Kata sandi wajib diisi.';
    else if (form.password.length < 6) newErrors.password = 'Kata sandi minimal 6 karakter.';
    if (!form.confirmPassword) newErrors.confirmPassword = 'Konfirmasi kata sandi Anda.';
    else if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Kata sandi tidak cocok.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      await signUp(form);
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Gagal Mendaftar', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderInput = ({ key, label, placeholder, keyboardType, autoCapitalize, isPassword, showPw, togglePw }) => (
    <View style={styles.fieldGroup} key={key}>
      <Text style={styles.label}>{label}</Text>
      {isPassword ? (
        <View style={[styles.inputRow, errors[key] && styles.inputError]}>
          <TextInput
            style={styles.inputFlex}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry={!showPw}
            value={form[key]}
            onChangeText={(t) => updateField(key, t)}
          />
          <Pressable onPress={togglePw} style={styles.eyeBtn} hitSlop={8}>
            {showPw
              ? <EyeOff size={20} color={COLORS.textLight} />
              : <Eye size={20} color={COLORS.textLight} />}
          </Pressable>
        </View>
      ) : (
        <TextInput
          style={[styles.input, errors[key] && styles.inputError]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'words'}
          autoCorrect={false}
          value={form[key]}
          onChangeText={(t) => updateField(key, t)}
        />
      )}
      {errors[key] ? <Text style={styles.errorText}>{errors[key]}</Text> : null}
    </View>
  );

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
              <Leaf size={26} color={COLORS.surface} />
            </View>
            <Text style={styles.appName}>AgriTrack</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Buat Akun</Text>
            <Text style={styles.subtitle}>
              Mulai kelola peternakan Anda bersama AgriTrack.
            </Text>

            {renderInput({
              key: 'name',
              label: 'Nama Lengkap',
              placeholder: 'Masukkan nama lengkap',
            })}
            {renderInput({
              key: 'email',
              label: 'Alamat Email',
              placeholder: 'Masukkan email Anda',
              keyboardType: 'email-address',
              autoCapitalize: 'none',
            })}
            {renderInput({
              key: 'phone',
              label: 'Nomor Telepon',
              placeholder: 'Masukkan nomor telepon',
              keyboardType: 'phone-pad',
              autoCapitalize: 'none',
            })}
            {renderInput({
              key: 'farmName',
              label: 'Nama Peternakan',
              placeholder: 'Masukkan nama peternakan',
            })}
            {renderInput({
              key: 'password',
              label: 'Kata Sandi',
              placeholder: 'Buat kata sandi',
              isPassword: true,
              showPw: showPassword,
              togglePw: () => setShowPassword(p => !p),
            })}
            {renderInput({
              key: 'confirmPassword',
              label: 'Konfirmasi Kata Sandi',
              placeholder: 'Masukkan ulang kata sandi',
              isPassword: true,
              showPw: showConfirmPassword,
              togglePw: () => setShowConfirmPassword(p => !p),
            })}

            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed, isLoading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.primaryBtnText}>
                {isLoading ? 'Mendaftar...' : 'Daftar'}
              </Text>
            </Pressable>

            <View style={styles.loginRow}>
              <Text style={styles.loginPrompt}>Sudah punya akun? </Text>
              <Pressable onPress={() => router.back()}>
                <Text style={styles.loginLink}>Masuk</Text>
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
    paddingTop: 24,
    paddingBottom: 32,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...SHADOWS.button,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: -0.4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 24,
    ...SHADOWS.card,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
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
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginPrompt: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
