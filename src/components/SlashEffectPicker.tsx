import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { FX_LIST, type FxKey } from './ChatEffects';
import { theme } from '../styles/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (key: FxKey) => void;
};

export default function SlashEffectPicker({ visible, onClose, onPick }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>🎬 Запустить эффект</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.6}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.grid}>
            {FX_LIST.map((fx) => (
              <TouchableOpacity
                key={fx.key}
                style={styles.btn}
                activeOpacity={0.7}
                onPress={() => { onPick(fx.key); onClose(); }}
              >
                <Text style={styles.btnText}>{fx.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  panel: { backgroundColor: theme.bg2, borderRadius: 16, padding: 16, maxHeight: '60%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: theme.accent, fontSize: 16, fontWeight: '600' },
  close: { color: theme.text3, fontSize: 20, padding: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  btnText: { color: theme.text, fontSize: 14 },
});
