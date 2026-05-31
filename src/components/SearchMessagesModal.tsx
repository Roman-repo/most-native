import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, FlatList, ActivityIndicator,
} from 'react-native';
import { theme } from '../styles/theme';
import { db } from '../services/firebase';
import { ref, get, query, limitToLast } from 'firebase/database';
import type { Message } from '../managers/ChatManager';

export type SearchResult = {
  chatId: string;
  chatName: string;
  msgKey: string;
  sender: string;
  text: string;
  ts: number;
};

type Props = {
  visible: boolean;
  user: string;
  chats: { id: string; name: string; members?: string[] }[];
  onClose: () => void;
  onOpenChat: (chatId: string, chatName: string) => void;
};

export default function SearchMessagesModal({ visible, user, chats, onClose, onOpenChat }: Props) {
  const [queryText, setQueryText] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      setQueryText('');
      setResults([]);
    }
  }, [visible]);

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim().toLowerCase();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const all: SearchResult[] = [];
    for (const chat of chats) {
      try {
        const snap = await get(query(ref(db, 'messages/' + chat.id), limitToLast(200)));
        const data = snap.val() || {};
        Object.entries(data).forEach(([key, val]: [string, any]) => {
          const text = (val.text || '').toLowerCase();
          if (text.includes(trimmed)) {
            all.push({
              chatId: chat.id,
              chatName: chat.name,
              msgKey: key,
              sender: val.sender || '',
              text: val.text || '',
              ts: val.ts || 0,
            });
          }
        });
      } catch (e) {
        console.error('[Search]', e);
      }
    }
    // Sort by time desc
    all.sort((a, b) => b.ts - a.ts);
    setResults(all.slice(0, 30));
    setLoading(false);
  }, [chats]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleChange = (t: string) => {
    setQueryText(t);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(t), 400);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const highlight = (text: string, q: string) => {
    if (!q) return text;
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <Text style={styles.resultText} numberOfLines={2}>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <Text key={i} style={styles.highlight}>{part}</Text>
          ) : (
            <Text key={i}>{part}</Text>
          )
        )}
      </Text>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.6}>
            <Text style={styles.backTxt}>←</Text>
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Поиск по сообщениям..."
            placeholderTextColor={theme.text3}
            value={queryText}
            onChangeText={handleChange}
            autoFocus
          />
          {queryText.length > 0 && (
            <TouchableOpacity onPress={() => { setQueryText(''); setResults([]); }} activeOpacity={0.6}>
              <Text style={styles.clear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading && results.length === 0 && (
          <ActivityIndicator style={{ marginTop: 40 }} color={theme.accent} />
        )}

        {!loading && queryText.trim().length >= 2 && results.length === 0 && (
          <Text style={styles.empty}>Не найдено</Text>
        )}

        <FlatList
          data={results}
          keyExtractor={(item) => item.chatId + '_' + item.msgKey}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              activeOpacity={0.7}
              onPress={() => { onClose(); onOpenChat(item.chatId, item.chatName); }}
            >
              <View style={styles.itemTop}>
                <Text style={styles.itemChat} numberOfLines={1}>{item.chatName}</Text>
                <Text style={styles.itemTime}>{formatTime(item.ts)}</Text>
              </View>
              <Text style={styles.itemSender}>{item.sender}</Text>
              {highlight(item.text, queryText.trim())}
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: 'rgba(15,12,41,0.78)',
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backTxt: { color: theme.text, fontSize: 22 },
  input: {
    flex: 1, height: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, paddingHorizontal: 12,
    color: theme.text, fontSize: 15,
  },
  clear: { color: theme.text3, fontSize: 18, padding: 4 },
  empty: { textAlign: 'center', color: theme.text3, marginTop: 40, fontSize: 15 },
  item: { paddingHorizontal: 16, paddingVertical: 12 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  itemChat: { color: theme.accent, fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  itemTime: { color: theme.text2, fontSize: 12, flexShrink: 0 },
  itemSender: { color: theme.text2, fontSize: 13, marginBottom: 2 },
  resultText: { color: theme.text, fontSize: 15, lineHeight: 20 },
  highlight: { backgroundColor: 'rgba(102,126,234,0.4)', color: '#fff' },
  sep: { height: 1, backgroundColor: theme.border, marginLeft: 16 },
});
