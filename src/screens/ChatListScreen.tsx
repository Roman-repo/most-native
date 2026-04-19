import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { db } from '../services/firebase';
import { ref, onValue, off } from 'firebase/database';
import { theme } from '../styles/theme';
import { listenUserPresence } from '../services/presence';
import { listenTyping } from '../services/typing';

type Chat = {
  id: string;
  name: string;
  lastText: string;
  lastTs: number;
  isGeneral: boolean;
  isGroup: boolean;
  otherUser: string | null;
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

      const g = data['general'] || {};
      list.push({
        id: 'general',
        name: 'Общий чат',
        lastText: g.lastText || '',
        lastTs: g.lastTs || 0,
        isGeneral: true,
        isGroup: false,
        otherUser: null,
      });

      Object.keys(data).forEach((k) => {
        if (k === 'general') return;
        const r = data[k];
        if (!r.members || !r.members.includes(user)) return;
        const others = r.members.filter((m: string) => m !== user);
        const name = r.groupName || others.join(', ');
        const isGroup = r.members.length > 2;
        list.push({
          id: k,
          name,
          lastText: r.lastText || '',
          lastTs: r.lastTs || 0,
          isGeneral: false,
          isGroup,
          otherUser: isGroup ? null : (others[0] || null),
        });
      });

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

  const [onlineMap, setOnlineMap] = useState<Record<string, boolean>>({});
  const otherUsers = useMemo(() => {
    const set = new Set<string>();
    chats.forEach(c => { if (c.otherUser) set.add(c.otherUser); });
    return Array.from(set);
  }, [chats]);

  useEffect(() => {
    if (otherUsers.length === 0) return;
    const unsubs = otherUsers.map(u =>
      listenUserPresence(u, (st) => {
        setOnlineMap(prev => prev[u] === st.online ? prev : { ...prev, [u]: st.online });
      })
    );
    return () => { unsubs.forEach(fn => fn()); };
  }, [otherUsers.join('|')]);

  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (chats.length === 0) return;
    const unsubs = chats.map(c =>
      listenTyping(c.id, user, (ts) => {
        const has = ts.length > 0;
        setTypingMap(prev => prev[c.id] === has ? prev : { ...prev, [c.id]: has });
      })
    );
    return () => { unsubs.forEach(fn => fn()); };
  }, [chats.map(c => c.id).join('|'), user]);

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
        <TouchableOpacity onPress={onOpenDrawer} style={styles.menuBtn} activeOpacity={0.6}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Line x1="3" y1="6" x2="21" y2="6" stroke={theme.text} strokeWidth="2" strokeLinecap="round" />
            <Line x1="3" y1="12" x2="21" y2="12" stroke={theme.text} strokeWidth="2" strokeLinecap="round" />
            <Line x1="3" y1="18" x2="21" y2="18" stroke={theme.text} strokeWidth="2" strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Мост</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatItem}
            onPress={() => onOpenChat(item.id, item.name, item.isGroup || item.isGeneral)}
            activeOpacity={0.7}
          >
            <View style={styles.avatarWrap}>
              <View style={[styles.avatar, { backgroundColor: getAvatarBg(item) }]}>
                <Text style={styles.avatarText}>{getAvatar(item)}</Text>
              </View>
              {item.otherUser && onlineMap[item.otherUser] && (
                <View style={styles.onlineDot} />
              )}
            </View>
            <View style={styles.chatInfo}>
              <View style={styles.chatTop}>
                <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.chatTime}>{formatTime(item.lastTs)}</Text>
              </View>
              {typingMap[item.id] ? (
                <Text style={[styles.chatPreview, styles.chatPreviewTyping]} numberOfLines={1}>печатает...</Text>
              ) : (
                <Text style={styles.chatPreview} numberOfLines={1}>{item.lastText || 'Нет сообщений'}</Text>
              )}
            </View>
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
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(15,12,41,0.78)',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  menuBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text },

  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
  },
  avatarWrap: { width: 50, height: 50, position: 'relative', flexShrink: 0 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, color: '#fff' },
  onlineDot: {
    position: 'absolute',
    bottom: 2, right: 2,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: theme.bg,
  },

  chatInfo: { flex: 1, minWidth: 0 },
  chatTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  chatName: { fontSize: 16, fontWeight: '500', color: theme.text, flex: 1, marginRight: 8 },
  chatTime: { fontSize: 12, color: theme.text3, flexShrink: 0 },
  chatPreview: { fontSize: 14, color: theme.text3 },
  chatPreviewTyping: { color: '#4CAF50', fontStyle: 'italic' },

  separator: { height: 1, backgroundColor: theme.border, marginLeft: 80 },
  empty: { textAlign: 'center', color: theme.text3, marginTop: 60, fontSize: 15 },
});
