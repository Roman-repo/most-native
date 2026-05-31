import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Animated,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Svg, { Line } from 'react-native-svg';
import { db } from '../services/firebase';
import { ref, onValue, off, get, query, limitToLast } from 'firebase/database';
import { theme } from '../styles/theme';
import { listenUserPresence } from '../services/presence';
import { listenTyping } from '../services/typing';
import { listenUnread } from '../services/unread';
import AvatarView from '../components/AvatarView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSearch, IconClose } from '../components/Icons';
import ChatListSkeleton from '../components/ChatListSkeleton';
import Skeleton from '../components/Skeleton';

type Chat = {
  id: string;
  name: string;
  lastText: string;
  lastTs: number;
  isGeneral: boolean;
  isGroup: boolean;
  otherUser: string | null;
};

type MessageResult = {
  chatId: string;
  chatName: string;
  msgKey: string;
  sender: string;
  text: string;
  ts: number;
};

type ListItem =
  | { type: 'chat'; chat: Chat }
  | { type: 'header'; title: string }
  | { type: 'message'; result: MessageResult };

type Props = {
  user: string;
  onOpenChat: (chatId: string, chatName: string, isGroup: boolean) => void;
  onOpenDrawer: () => void;
};

export default function ChatListScreen({ user, onOpenChat, onOpenDrawer }: Props) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageResults, setMessageResults] = useState<MessageResult[]>([]);
  const [searchingMessages, setSearchingMessages] = useState(false);
  const searchAnim = useMemo(() => new Animated.Value(0), []);

  // Debounced global message search
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) {
      setMessageResults([]);
      setSearchingMessages(false);
      return;
    }
    setSearchingMessages(true);
    const timer = setTimeout(async () => {
      const all: MessageResult[] = [];
      for (const chat of chats) {
        try {
          const snap = await get(query(ref(db, 'messages/' + chat.id), limitToLast(200)));
          const data = snap.val() || {};
          Object.entries(data).forEach(([key, val]: [string, any]) => {
            const text = (val.text || '').toLowerCase();
            if (text.includes(q)) {
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
        } catch (e) { console.error('[Search]', e); }
      }
      all.sort((a, b) => b.ts - a.ts);
      setMessageResults(all.slice(0, 30));
      setSearchingMessages(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, chats]);

  useEffect(() => {
    Animated.timing(searchAnim, {
      toValue: searchOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [searchOpen]);

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

  const [unreadMap, setUnreadMap] = useState<Record<string, { count: number; capped: boolean }>>({});
  useEffect(() => {
    if (chats.length === 0) return;
    const unsubs = chats.map(c =>
      listenUnread(c.id, user, (count, capped) => {
        setUnreadMap(prev => {
          const cur = prev[c.id];
          if (cur && cur.count === count && cur.capped === capped) return prev;
          return { ...prev, [c.id]: { count, capped } };
        });
      })
    );
    return () => { unsubs.forEach(fn => fn()); };
  }, [chats.map(c => c.id).join('|'), user]);

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

  // Drafts indicator (REQ-38)
  const [draftMap, setDraftMap] = useState<Record<string, boolean>>({});
  useEffect(() => {
    AsyncStorage.getAllKeys().then((keys) => {
      const draftKeys = keys.filter((k) => k.startsWith('draft_'));
      const map: Record<string, boolean> = {};
      draftKeys.forEach((k) => { map[k.replace('draft_', '')] = true; });
      setDraftMap(map);
    });
  }, [chats.map(c => c.id).join('|')]);

  function formatTime(ts: number): string {
    if (!ts) return '';
    // Firebase may return seconds instead of ms for some legacy data
    let t = ts;
    if (ts < 10000000000) t = ts * 1000;
    const d = new Date(t);
    const now = new Date();

    // Reset time part for clean date comparison
    const stripTime = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const daysDiff = Math.floor((stripTime(now).getTime() - stripTime(d).getTime()) / (1000 * 60 * 60 * 24));

    // Today → "12:34"
    if (daysDiff === 0) {
      return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    }

    // Yesterday → "Вчера"
    if (daysDiff === 1) {
      return 'Вчера';
    }

    // Current week → "Пн", "Вт"... (up to 6 days back)
    if (daysDiff >= 2 && daysDiff <= 6) {
      const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      return weekdays[d.getDay()];
    }

    // Older → "15.05" or "15.05.2024" if different year
    if (d.getFullYear() !== now.getFullYear()) {
      return d.getDate().toString().padStart(2, '0') + '.' + (d.getMonth() + 1).toString().padStart(2, '0') + '.' + d.getFullYear();
    }
    return d.getDate().toString().padStart(2, '0') + '.' + (d.getMonth() + 1).toString().padStart(2, '0');
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

  const renderChatItem = useCallback(({ item }: { item: Chat }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => onOpenChat(item.id, item.name, item.isGroup || item.isGeneral)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarWrap}>
        {item.isGeneral || item.isGroup ? (
          <View style={[styles.avatar, { backgroundColor: getAvatarBg(item) }]}>
            <Text style={styles.avatarText}>{getAvatar(item)}</Text>
          </View>
        ) : (
          <AvatarView user={item.otherUser || item.name} size={48} fontSize={20} />
        )}
        {item.otherUser && onlineMap[item.otherUser] && (
          <View style={styles.onlineDot} />
        )}
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatTop}>
          <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.chatTime}>{formatTime(item.lastTs)}</Text>
        </View>
        <View style={styles.chatBottom}>
          {draftMap[item.id] ? (
            <Text style={[styles.chatPreview, styles.chatPreviewDraft]} numberOfLines={1}>Черновик: {item.lastText || '...'}</Text>
          ) : typingMap[item.id] ? (
            <Text style={[styles.chatPreview, styles.chatPreviewTyping]} numberOfLines={1}>печатает...</Text>
          ) : (
            <Text style={styles.chatPreview} numberOfLines={1}>{item.lastText || 'Нет сообщений'}</Text>
          )}
          {unreadMap[item.id]?.count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {unreadMap[item.id].capped ? '50+' : unreadMap[item.id].count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  ), [onOpenChat, onlineMap, typingMap, unreadMap, draftMap]);

  function highlightText(text: string, q: string) {
    if (!q) return <Text style={styles.msgItemText} numberOfLines={2}>{text}</Text>;
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <Text style={styles.msgItemText} numberOfLines={2}>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <Text key={i} style={styles.highlight}>{part}</Text>
          ) : (
            <Text key={i}>{part}</Text>
          )
        )}
      </Text>
    );
  }

  const renderListItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'chat') {
      return renderChatItem({ item: item.chat });
    }
    if (item.type === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
        </View>
      );
    }
    const r = item.result;
    const chatForResult = chats.find((c) => c.id === r.chatId);
    const isGroup = chatForResult?.isGroup || false;
    return (
      <TouchableOpacity
        style={styles.chatItem}
        activeOpacity={0.7}
        onPress={() => onOpenChat(r.chatId, r.chatName, isGroup)}
      >
        <View style={styles.avatarWrap}>
          {chatForResult?.isGeneral || chatForResult?.isGroup ? (
            <View style={[styles.avatar, { backgroundColor: chatForResult ? getAvatarBg(chatForResult) : theme.accent }]}>
              <Text style={styles.avatarText}>{chatForResult ? getAvatar(chatForResult) : '?'}</Text>
            </View>
          ) : (
            <AvatarView user={chatForResult?.otherUser || r.chatName} size={48} fontSize={20} />
          )}
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatTop}>
            <Text style={styles.chatName} numberOfLines={1}>{r.chatName}</Text>
            <Text style={styles.chatTime}>{formatTime(r.ts)}</Text>
          </View>
          <Text style={[styles.chatPreview, { fontWeight: '500' }]} numberOfLines={1}>{r.sender}</Text>
          {highlightText(r.text, searchQuery.trim())}
        </View>
      </TouchableOpacity>
    );
  }, [renderChatItem, onOpenChat, chats, searchQuery]);

  const keyExtractor = useCallback((item: ListItem) => {
    if (item.type === 'chat') return item.chat.id;
    if (item.type === 'header') return 'header_' + item.title;
    return item.result.chatId + '_' + item.result.msgKey;
  }, []);

  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.lastText || '').toLowerCase().includes(q) ||
      (c.otherUser || '').toLowerCase().includes(q)
    );
  }, [chats, searchQuery]);

  const listItems = useMemo<ListItem[]>(() => {
    if (!searchQuery.trim()) {
      return chats.map((c) => ({ type: 'chat' as const, chat: c }));
    }
    const items: ListItem[] = [];
    filteredChats.forEach((c) => items.push({ type: 'chat', chat: c }));
    if (messageResults.length > 0) {
      if (filteredChats.length > 0) {
        items.push({ type: 'header', title: 'Сообщения' });
      }
      messageResults.forEach((r) => items.push({ type: 'message', result: r }));
    }
    return items;
  }, [chats, searchQuery, filteredChats, messageResults]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: 60 }]}>
          <Skeleton width={36} height={36} borderRadius={18} />
          <Skeleton width={100} height={20} borderRadius={10} />
          <Skeleton width={36} height={36} borderRadius={18} />
        </View>
        <ChatListSkeleton count={10} />
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

        {/* Title — fades out when search opens */}
        <Animated.View
          style={[
            styles.headerTitleWrap,
            { opacity: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
          ]}
          pointerEvents={searchOpen ? 'none' : 'auto'}
        >
          <Text style={styles.headerTitle}>Мост</Text>
        </Animated.View>

        {/* Search field — fades in when search opens */}
        <Animated.View
          style={[
            styles.searchFieldWrap,
            {
              opacity: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
              pointerEvents: searchOpen ? 'auto' : 'none',
            },
          ]}
        >
          <View style={styles.searchFieldInner}>
            <IconSearch size={16} color={theme.text3} />
            <TextInput
              style={styles.searchInput}
              placeholder="Поиск чатов"
              placeholderTextColor={theme.text3}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={searchOpen}
            />
          </View>
        </Animated.View>

        {/* Search / Close button */}
        {searchOpen ? (
          <TouchableOpacity
            onPress={() => { setSearchQuery(''); setSearchOpen(false); }}
            style={styles.searchBtn}
            activeOpacity={0.6}
          >
            <IconClose size={20} color={theme.text} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setSearchOpen(true)} style={styles.searchBtn} activeOpacity={0.6}>
            <IconSearch size={20} color={theme.text} />
          </TouchableOpacity>
        )}
      </View>

      <FlashList
        data={listItems}
        keyExtractor={keyExtractor}
        renderItem={renderListItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          searchingMessages ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator color={theme.accent} />
            </View>
          ) : (
            <Text style={styles.empty}>
              {searchQuery.trim() ? 'Чаты и сообщения не найдены' : 'Нет чатов'}
            </Text>
          )
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
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(15,12,41,0.78)',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  menuBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text },
  searchFieldWrap: { position: 'absolute', left: 56, right: 56, top: 52, bottom: 14, justifyContent: 'center' },
  searchFieldInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
    gap: 6,
  },
  searchInput: { flex: 1, color: theme.text, fontSize: 15, paddingVertical: 0 },
  searchBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

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
  chatTime: { fontSize: 12, color: theme.text2, flexShrink: 0 },
  chatBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chatPreview: { flex: 1, fontSize: 14, color: theme.text3 },
  chatPreviewTyping: { color: '#4CAF50', fontStyle: 'italic' },
  chatPreviewDraft: { color: '#E85D75', fontStyle: 'italic' },
  unreadBadge: {
    minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: theme.accent,
    paddingHorizontal: 7,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  separator: { height: 1, backgroundColor: theme.border, marginLeft: 80 },
  empty: { textAlign: 'center', color: theme.text3, marginTop: 60, fontSize: 15 },
  emptyWrap: { alignItems: 'center', marginTop: 60 },

  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: theme.bg,
  },
  sectionTitle: { fontSize: 13, color: theme.text2, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  msgItem: { paddingHorizontal: 16, paddingVertical: 12 },
  msgItemTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  msgItemChat: { color: theme.accent, fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  msgItemTime: { color: theme.text2, fontSize: 12, flexShrink: 0 },
  msgItemSender: { color: theme.text2, fontSize: 13, marginBottom: 2 },
  msgItemText: { color: theme.text, fontSize: 15, lineHeight: 20 },
  highlight: { backgroundColor: 'rgba(102,126,234,0.4)', color: '#fff' },
});
