import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { FX_LIST } from './ChatEffects';
import { theme } from '../styles/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function SlashWordsCard({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>✨ Триггерные слова</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.6}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            {FX_LIST.map((fx) => (
              <View key={fx.key} style={styles.row}>
                <Text style={styles.name}>{fx.name}</Text>
                <Text style={styles.words}>{fx.words.join(', ')}</Text>
              </View>
            ))}
            <Text style={styles.footer}>Отправьте сообщение с этими словами для запуска эффекта</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  panel: { backgroundColor: theme.bg2, borderRadius: 16, padding: 16, maxHeight: '70%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: theme.accent, fontSize: 16, fontWeight: '600' },
  close: { color: theme.text3, fontSize: 20, padding: 4 },
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  name: { color: theme.text, fontSize: 14, fontWeight: '500' },
  words: { color: theme.text2, fontSize: 12, marginTop: 2 },
  footer: { color: theme.text3, fontSize: 11, marginTop: 10, textAlign: 'center' },
});
