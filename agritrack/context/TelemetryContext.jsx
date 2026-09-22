import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

const TelemetryContext = createContext(null);
const STORAGE_KEY = 'ecoherd_api_url';

export function TelemetryProvider({ children }) {
  const [baseUrl, setBaseUrl] = useState('');
  const [devices, setDevices] = useState([]);
  const [livestock, setLivestock] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  const defaultUrl = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return process.env.EXPO_PUBLIC_API_MODE === 'same-origin'
        ? window.location.origin : `${window.location.protocol}//${window.location.hostname}:3001`;
    }
    return process.env.EXPO_PUBLIC_API_URL || 'http://172.20.10.2:3001';
  };

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY).then(value => {
      if (active) setBaseUrl(value || defaultUrl());
    }).catch(() => {
      if (active) setError('Gagal membaca pengaturan API.');
    }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const request = useCallback(async (path, options = {}) => {
    if (!baseUrl) throw new Error('Isi alamat API pada halaman Record Sensor.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...options, signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...options.headers },
      });
      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Alamat ini bukan API JSON. Periksa port/alamat backend.');
      }
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || `API HTTP ${response.status}`);
      return body;
    } catch (failure) {
      if (failure.name === 'AbortError') throw new Error('API tidak merespons dalam 8 detik.');
      throw failure;
    } finally { clearTimeout(timer); }
  }, [baseUrl]);

  const refresh = useCallback(async () => {
    const [deviceData, cowData] = await Promise.all([request('/api/devices'), request('/api/livestock')]);
    setDevices(deviceData.devices);
    setLivestock(cowData.livestock);
    setDataLoaded(true);
    setError('');
  }, [request]);

  useEffect(() => {
    if (!baseUrl || !ready) return;
    let active = true;
    let timer;
    const poll = async () => {
      try {
        const [body, cows] = await Promise.all([request('/api/devices'), request('/api/livestock')]);
        if (active) { setDevices(body.devices); setLivestock(cows.livestock); setDataLoaded(true); setError(''); }
      } catch (failure) {
        if (active) setError(`Koneksi API gagal: ${failure.message}`);
      } finally {
        if (active) timer = setTimeout(poll, 5000);
      }
    };
    poll();
    return () => { active = false; clearTimeout(timer); };
  }, [baseUrl, ready, request]);

  const saveBaseUrl = async value => {
    const normalized = value.trim().replace(/\/+$/, '');
    if (normalized) {
      let url;
      try { url = new URL(normalized); } catch { throw new Error('Alamat API tidak valid.'); }
      if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash) {
        throw new Error('Gunakan alamat dasar, contoh http://192.168.1.10:3001 tanpa /api.');
      }
    }
    await AsyncStorage.setItem(STORAGE_KEY, normalized);
    setDevices([]);
    setLivestock([]);
    setDataLoaded(false);
    setError('');
    setBaseUrl(normalized);
  };

  return (
    <TelemetryContext.Provider value={{ baseUrl, devices, livestock, dataLoaded, refresh, error, ready, request, saveBaseUrl, defaultUrl }}>
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry() {
  const context = useContext(TelemetryContext);
  if (!context) throw new Error('TelemetryProvider tidak ditemukan.');
  return context;
}
