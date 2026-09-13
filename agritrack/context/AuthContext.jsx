import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const AUTH_STORAGE_KEY = 'agritrack_user_session';
const USERS_REGISTRY_KEY = 'agritrack_users';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on app launch
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          setUser(JSON.parse(stored));
        }
      } catch (e) {
        // Session restore failed, start unauthenticated
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const signIn = useCallback(async (email, password) => {
    if (!email || !password) {
      throw new Error('Email dan kata sandi wajib diisi.');
    }
    
    const formattedEmail = email.toLowerCase().trim();

    const usersData = await AsyncStorage.getItem(USERS_REGISTRY_KEY);
    const users = usersData ? JSON.parse(usersData) : [];

    const existingUser = users.find(u => u.email === formattedEmail);

    if (!existingUser) {
      throw new Error('Akun tidak ditemukan. Silakan daftar terlebih dahulu.');
    }

    if (existingUser.password !== password) {
      throw new Error('Kata sandi salah. Silakan coba lagi.');
    }

    const sessionData = { ...existingUser };
    delete sessionData.password; // Do not keep password in session

    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
    setUser(sessionData);
    return sessionData;
  }, []);

  const signUp = useCallback(async ({ name, email, phone, farmName, password, confirmPassword }) => {
    if (!name || !email || !password || !confirmPassword) {
      throw new Error('Semua kolom wajib diisi.');
    }
    if (!email.includes('@')) {
      throw new Error('Masukkan alamat email yang valid.');
    }
    if (password.length < 6) {
      throw new Error('Kata sandi minimal 6 karakter.');
    }
    if (password !== confirmPassword) {
      throw new Error('Kata sandi tidak cocok.');
    }

    const formattedEmail = email.toLowerCase().trim();

    const usersData = await AsyncStorage.getItem(USERS_REGISTRY_KEY);
    const users = usersData ? JSON.parse(usersData) : [];

    if (users.find(u => u.email === formattedEmail)) {
      throw new Error('Email ini sudah terdaftar.');
    }

    const newUser = {
      id: Date.now().toString(),
      name: name.trim(),
      email: formattedEmail,
      phone: phone?.trim() || '',
      farmName: farmName?.trim() || 'Peternakan Saya',
      role: 'Peternak',
      location: 'Indonesia',
      password, // Stored only in registry, not in session
    };

    users.push(newUser);
    await AsyncStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(users));

    const sessionData = { ...newUser };
    delete sessionData.password;

    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
    setUser(sessionData);
    return sessionData;
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
