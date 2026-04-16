import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { theme } from '../styles/theme';
import { QUICK_REACTIONS, ALL_EMOJIS } from '../utils/emoji';

type Props = {
  visible: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onPin?: () => void;
  isMe: boolean;
};

export default function ReactionPicker({ visible, onClose, onReact, onReply, onPin, isMe }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Быстрые реакции */}
        <View style={styles.quickRow}>
          {QUICK_REACTIONS.map((e) => (
            <TouchableOpacity key={e} style={styles.quickBtn} onPress={() => { onReact(e); onClose(); }}>
              <Text style={styles.quickEmoji}>{e}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.moreBtn} onPress={() => {}}>
            <Text style={styles.moreTxt}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Действия */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => { onReply(); onClose(); }}>
            <Text style={styles.actionIcon}>↩</Text>
            <Text style={styles.actionText}>Ответить</Text>
          </TouchableOpacity>
          {onPin && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => { onPin(); onClose(); }}>
              <Text style={styles.actionIcon}>📌</Text>
              <Text style={styles.actionText}>Закрепить</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Все эмодзи */}
        <ScrollView style={styles.allEmoji} contentContainerStyle={styles.allEmojiContent}>
          {ALL_EMOJIS.map((e) => (
            <TouchableOpacity key={e} onPress={() => { onReact(e); onClose(); }}>
              <Text style={styles.emojiItem}>{e}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: theme.bg2,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: Dimensions.get('window').height * 0.55,
  },
  quickRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 4,
  },
  quickBtn: { flex: 1, alignItems: 'center', padding: 6 },
  quickEmoji: { fontSize: 26 },
  moreBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.bg3, borderRadius: 20, padding: 6,
  },
  moreTxt: { color: theme.text2, fontSize: 18, fontWeight: '600' },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.bg3, borderRadius: 12, padding: 10, gap: 6,
  },
  actionIcon: { fontSize: 16 },
  actionText: { color: theme.text, fontSize: 14, fontWeight: '500' },
  allEmoji: { maxHeight: 200 },
  allEmojiContent: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  emojiItem: { fontSize: 26, padding: 6 },
});
