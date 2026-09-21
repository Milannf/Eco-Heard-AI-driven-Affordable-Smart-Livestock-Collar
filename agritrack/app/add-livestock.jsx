import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTelemetry } from '../context/TelemetryContext';
import { Screen, ConnectionNotice, ui } from '../components/TelemetryUI';

export default function AddLivestockScreen() {
  const { request, refresh } = useTelemetry();
  const router = useRouter();
  const [form, setForm] = useState({ display_id: '', breed: '', barn: '', sex: '', weight_kg: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (name, value) => setForm(previous => ({ ...previous, [name]: value }));
  async function save() {
    setSaving(true); setError('');
    try {
      const weight = form.weight_kg.trim() === '' ? null : Number(form.weight_kg);
      if (!form.display_id.trim()) throw new Error('ID/nama ternak wajib diisi.');
      if (weight !== null && (!Number.isFinite(weight) || weight <= 0)) throw new Error('Berat harus angka positif.');
      const cow = await request('/api/livestock', { method: 'POST', body: JSON.stringify({ ...form, weight_kg: weight }) });
      // Data sudah tersimpan meskipun refresh jaringan berikutnya gagal.
      await refresh().catch(() => {});
      router.replace(`/livestock/${cow.id}`);
    } catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  }
  return <Screen title="Daftarkan ternak">
    <ConnectionNotice />
    <Text style={ui.note}>Data disimpan di database backend. Kolom opsional yang kosong tetap kosong.</Text>
    {[['display_id', 'ID/nama ternak *'], ['breed', 'Ras (opsional)'], ['barn', 'Kandang (opsional)'], ['weight_kg', 'Berat kg (opsional)']].map(([key, label]) => <View key={key}>
      <Text style={ui.note}>{label}</Text>
      <TextInput style={ui.input} value={form[key]} onChangeText={value => set(key, value)} maxLength={100}
        keyboardType={key === 'weight_kg' ? 'decimal-pad' : 'default'} editable={!saving} />
    </View>)}
    <Text style={ui.note}>Jenis kelamin: {form.sex || 'Belum diisi'}</Text>
    {['', 'Betina', 'Jantan'].map(sex => <Pressable key={sex} onPress={() => set('sex', sex)} disabled={saving} style={ui.button}>
      <Text style={ui.buttonText}>{form.sex === sex ? '✓ ' : ''}{sex || 'Kosongkan'}</Text>
    </Pressable>)}
    {!!error && <Text style={ui.error}>{error}</Text>}
    <Pressable style={ui.button} disabled={saving} onPress={save}><Text style={ui.buttonText}>{saving ? 'Menyimpan...' : 'Simpan ternak'}</Text></Pressable>
  </Screen>;
}
