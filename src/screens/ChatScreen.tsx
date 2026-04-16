import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { theme } from '../styles/theme';

type Props = {
  chatId: string;
  chatName: string;
  onBack: () => void;
};

export default function ChatScreen({ chatId, chatName, onBack }: Props) {
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Хедер */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{chatName}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Пустая область сообщений */}
      <View style={styles.messages}>
        <Text style={styles.emptyText}>Сообщения появятся в Фазе 2</Text>
      </View>

      {/* Поле ввода (заглушка) */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Сообщение..."
          placeholderTextColor={theme.text3}
          editable={false}
        />
        <TouchableOpacity style={styles.sendBtn}>
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.bg2,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backBtn: { width: 40 },
  backIcon: { fontSize: 22, color: theme.accent },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: theme.text, textAlign: 'center' },
  messages: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: theme.text3, fontSize: 14 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 24,
    backgroundColor: theme.bg2,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  input: {
    flex: 1,
    backgroundColor: theme.bg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sendBtn: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: { color: '#fff', fontSize: 16 },
});
