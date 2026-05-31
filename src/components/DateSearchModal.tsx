import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet,
} from 'react-native';
import { theme } from '../styles/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSearch: (dateStr: string) => void;
};

export default function DateSearchModal({ visible, onClose, onSearch }: Props) {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  const handleSearch = () => {
    const d = day.padStart(2, '0');
    const m = month.padStart(2, '0');
    const y = year.length === 2 ? '20' + year : year;
    if (!d || !m || !y) return;
    onSearch(`${d}.${m}.${y}`);
    setDay(''); setMonth(''); setYear('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.title}>Перейти к дате</Text>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              placeholder="ДД"
              placeholderTextColor={theme.text3}
              keyboardType="number-pad"
              maxLength={2}
              value={day}
              onChangeText={setDay}
            />
            <Text style={styles.dot}>.</Text>
            <TextInput
              style={styles.input}
              placeholder="ММ"
              placeholderTextColor={theme.text3}
              keyboardType="number-pad"
              maxLength={2}
              value={month}
              onChangeText={setMonth}
            />
            <Text style={styles.dot}>.</Text>
            <TextInput
              style={[styles.input, { width: 70 }]}
              placeholder="ГГГГ"
              placeholderTextColor={theme.text3}
              keyboardType="number-pad"
              maxLength={4}
              value={year}
              onChangeText={setYear}
            />
          </View>
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.btnTextSecondary}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={handleSearch} activeOpacity={0.7}>
              <Text style={styles.btnText}>Найти</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  panel: { backgroundColor: theme.bg2, borderRadius: 16, padding: 20, width: '100%', maxWidth: 320 },
  title: { color: theme.text, fontSize: 17, fontWeight: '600', textAlign: 'center', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 20 },
  input: {
    width: 50, height: 48,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, textAlign: 'center',
    color: theme.text, fontSize: 16,
  },
  dot: { color: theme.text2, fontSize: 18 },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, backgroundColor: theme.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnSecondary: { backgroundColor: 'rgba(255,255,255,0.1)' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnTextSecondary: { color: theme.text2, fontSize: 15 },
});
