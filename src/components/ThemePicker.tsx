import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';
import { CHAT_THEMES, type ChatTheme } from '../utils/chatThemes';

type Props = {
  current: ChatTheme | null;
  onSelect: (t: ChatTheme | null) => void;
  onClose: () => void;
};

export default function ThemePicker({ current, onSelect, onClose }: Props) {
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Тема чата</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        <TouchableOpacity
          style={[styles.card, !current && styles.cardActive]}
          onPress={() => onSelect(null)}
        >
          <View style={[styles.preview, { backgroundColor: '#667eea' }]} />
          <Text style={styles.cardLabel}>По умолчанию</Text>
        </TouchableOpacity>
        {CHAT_THEMES.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.card, current?.id === t.id && styles.cardActive]}
            onPress={() => onSelect(t)}
          >
            <View style={[styles.preview, { backgroundColor: t.acc }]} />
            <Text style={styles.cardEmoji}>{t.emoji}</Text>
            <Text style={styles.cardLabel}>{t.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: 'rgba(15,12,41,0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 16, fontWeight: '600', color: theme.text },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 18, color: theme.text3 },
  list: { paddingHorizontal: 12, gap: 10, alignItems: 'center' },
  card: {
    alignItems: 'center',
    gap: 4,
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 72,
  },
  cardActive: { borderColor: theme.accent },
  preview: { width: 52, height: 52, borderRadius: 26 },
  cardEmoji: { fontSize: 20, marginTop: -20 },
  cardLabel: { fontSize: 11, color: theme.text2, textAlign: 'center' },
});
