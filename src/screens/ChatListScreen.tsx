import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { db } from '../services/firebase';
import { ref, onValue, off } from 'firebase/database';
import { theme } from '../styles/theme';

type Chat = {
  id: string;
  name: string;
  lastText: string;
  lastTs: number;
  isGeneral: boolean;
  isGroup: boolean;
};

type Props = {
  user: string;
  onOpenChat: (chatId: string, chatName: string, isGroup: boolean) => void;
  onOpenDrawer: () => void;
};

export default function ChatListScreen({ user, onOpenChat, onOpenDrawer }: Props) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const chatsRef = ref(db, 'chats');
    const unsub = onValue(chatsRef, (snap) => {
      const data = snap.val() || {};
      const list: Chat[] = [];

      // Общий чат всегда первым
      const g = data['general'] || {};
      list.push({
        id: 'general',
        name: 'Общий чат',
        lastText: g.lastText || '',
        lastTs: g.lastTs || 0,
        isGeneral: true,
        isGroup: false,
      });

      Object.keys(data).forEach((k) => {
        if (k === 'general') return;
        const r = data[k];
        if (!r.members || !r.members.includes(user)) return;
        const others = r.members.filter((m: string) => m !== user);
        const name = r.groupName || others.join(', ');
        list.push({
          id: k,
          name,
          lastText: r.lastText || '',
          lastTs: r.lastTs || 0,
          isGeneral: false,
          isGroup: r.members.length > 2,
        });
      });

      // Общий чат закреплён сверху, остальные по времени
      list.sort((a, b) => {
        if (a.isGeneral) return -1;
        if (b.isGeneral) return 1;
        return (b.lastTs || 0) - (a.lastTs || 0);
      });

      setChats(list);
      setLoading(false);
    });

    return () => off(chatsRef, 'value', unsub);
  }, [user]);

  function formatTime(ts: number): string {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    }
    return d.getDate() + '.' + (d.getMonth() + 1).toString().padStart(2, '0');
  }

  function getAvatar(chat: Chat): string {
    if (chat.isGeneral) return '💬';
    if (chat.isGroup) return '👥';
    return chat.name.charAt(0).toUpperCase();
  }

  function getAvatarBg(chat: Chat): string {
    if (chat.isGeneral) return theme.accent;
    if (chat.isGroup) return theme.green;
    const colors = ['#E85D75','#6C5CE7','#00B894','#FDCB6E','#E17055','#0984E3','#A29BFE','#55EFC4'];
    let hash = 0;
    for (const c of chat.name) hash = (hash * 31 + c.charCodeAt(0)) % colors.length;
    return colors[hash];
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Хедер */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onOpenDrawer} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Мост</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chatItem} onPress={() => onOpenChat(item.id, item.name, item.isGroup || item.isGeneral)}>
            <View style={[styles.avatar, { backgroundColor: getAvatarBg(item) }]}>
              <Text style={styles.avatarText}>{getAvatar(item)}</Text>
            </View>
            <View style={styles.chatInfo}>
              <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.chatPreview} numberOfLines={1}>{item.lastText || 'Нет сообщений'}</Text>
            </View>
            <Text style={styles.chatTime}>{formatTime(item.lastTs)}</Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Text style={styles.empty}>Нет чатов</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
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
  menuBtn: { width: 40, alignItems: 'flex-start' },
  menuIcon: { fontSize: 22, color: theme.text },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 20, color: '#fff' },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 3 },
  chatPreview: { fontSize: 14, color: theme.text2 },
  chatTime: { fontSize: 12, color: theme.text3, marginLeft: 8 },
  separator: { height: 1, backgroundColor: theme.border, marginLeft: 80 },
  empty: { textAlign: 'center', color: theme.text3, marginTop: 60, fontSize: 15 },
});
