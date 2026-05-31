import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, ActivityIndicator,
} from 'react-native';
import { theme } from '../styles/theme';
import { db } from '../services/firebase';
import { ref, get } from 'firebase/database';
import AvatarView from './AvatarView';

type Reader = { user: string; ts: number };

type Props = {
  visible: boolean;
  chatId: string;
  msgTs: number;
  meUser: string;
  members: string[];
  onClose: () => void;
};

export default function ReadReceiptsModal({ visible, chatId, msgTs, meUser, members, onClose }: Props) {
  const [readers, setReaders] = useState<Reader[]>([]);
  const [unread, setUnread] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    get(ref(db, 'readReceipts/' + chatId)).then((snap) => {
      const data = snap.val() || {};
      const r: Reader[] = [];
      const u: string[] = [];
      for (const m of members) {
        if (m === meUser) continue;
        const ts = data[m];
        if (typeof ts === 'number' && ts >= msgTs) {
          r.push({ user: m, ts });
        } else {
          u.push(m);
        }
      }
      r.sort((a, b) => b.ts - a.ts);
      setReaders(r);
      setUnread(u);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [visible, chatId, msgTs, meUser, members]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>Прочитали</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.6}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading && <ActivityIndicator color={theme.accent} style={{ marginVertical: 20 }} />}

          {!loading && readers.length === 0 && unread.length === 0 && (
            <Text style={styles.empty}>Нет данных</Text>
          )}

          {readers.length > 0 && (
            <>
              <Text style={styles.section}>Прочитали</Text>
              <FlatList
                data={readers}
                keyExtractor={(item) => item.user}
                renderItem={({ item }) => (
                  <View style={styles.row}>
                    <AvatarView user={item.user} size={36} fontSize={16} />
                    <View style={styles.body}>
                      <Text style={styles.name}>{item.user}</Text>
                      <Text style={styles.time}>{formatTime(item.ts)}</Text>
                    </View>
                  </View>
                )}
              />
            </>
          )}

          {unread.length > 0 && (
            <>
              <Text style={styles.section}>Не прочитали</Text>
              {unread.map((u) => (
                <View key={u} style={styles.row}>
                  <AvatarView user={u} size={36} fontSize={16} />
                  <View style={styles.body}>
                    <Text style={styles.name}>{u}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  panel: { backgroundColor: theme.bg2, borderRadius: 16, padding: 16, maxHeight: '70%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: theme.text, fontSize: 17, fontWeight: '600' },
  close: { color: theme.text3, fontSize: 20, padding: 4 },
  empty: { textAlign: 'center', color: theme.text3, paddingVertical: 20 },
  section: { color: theme.text2, fontSize: 13, marginTop: 10, marginBottom: 6, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  body: { flex: 1 },
  name: { color: theme.text, fontSize: 15 },
  time: { color: theme.text2, fontSize: 12, marginTop: 1 },
});
