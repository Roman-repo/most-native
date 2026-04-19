import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../services/firebase';
import { theme } from '../styles/theme';

type Chat = { id: string; name: string; isGeneral: boolean; isGroup: boolean };

type Props = {
  visible: boolean;
  user: string;
  excludeChatId?: string;
  onClose: () => void;
  onPick: (chatId: string) => void;
};

export default function ForwardModal({ visible, user, excludeChatId, onClose, onPick }: Props) {
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    if (!visible) return;
    const r = ref(db, 'chats');
    const h = onValue(r, (snap) => {
      const data = snap.val() || {};
      const list: Chat[] = [];
      const g = data['general'];
      if (g) list.push({ id: 'general', name: 'Общий чат', isGeneral: true, isGroup: false });
      Object.keys(data).forEach((k) => {
        if (k === 'general') return;
        const r2 = data[k];
        if (!r2.members || !r2.members.includes(user)) return;
        const others = (r2.members as string[]).filter(m => m !== user);
        const name = r2.groupName || others.join(', ');
        list.push({ id: k, name, isGeneral: false, isGroup: r2.members.length > 2 });
      });
      setChats(list.filter(c => c.id !== excludeChatId));
    });
    return () => off(r, 'value', h);
  }, [visible, user, excludeChatId]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Переслать в...</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.closeTxt}>✕</Text></TouchableOpacity>
        </View>
        <FlatList
          data={chats}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => onPick(item.id)} activeOpacity={0.7}>
              <Text style={styles.itemIcon}>{item.isGeneral ? '💬' : item.isGroup ? '👥' : item.name.charAt(0).toUpperCase()}</Text>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={<Text style={styles.empty}>Нет доступных чатов</Text>}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' },
  sheet: {
    position: 'absolute', left: 16, right: 16, top: '15%', bottom: '15%',
    backgroundColor: 'rgba(15,12,41,0.98)',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: { color: theme.text, fontSize: 17, fontWeight: '600' },
  closeTxt: { color: theme.text3, fontSize: 20, padding: 4 },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  itemIcon: { fontSize: 20, width: 32, textAlign: 'center' },
  itemName: { color: theme.text, fontSize: 16, flex: 1 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.08)', marginLeft: 60 },
  empty: { color: theme.text3, textAlign: 'center', padding: 40 },
});
