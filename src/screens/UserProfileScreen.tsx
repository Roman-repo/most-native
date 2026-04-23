import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Animated, Easing, Dimensions, Linking, Alert, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanGestureHandler, State as GHState } from 'react-native-gesture-handler';
import { theme } from '../styles/theme';
import { listenMessages, type Message } from '../managers/ChatManager';
import { listenUserPresence, formatLastSeen, type PresenceState } from '../services/presence';
import { startCall } from '../services/CallManager';
import {
  IconBack, IconChat, IconPhone, IconVideoCamera,
} from '../components/Icons';

const { width: SCREEN_W } = Dimensions.get('window');

const AVATAR_COLORS = ['#E85D75','#6C5CE7','#00B894','#FDCB6E','#E17055','#0984E3','#A29BFE','#55EFC4'];
function getAvatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

type TabKey = 'media' | 'files' | 'links' | 'audio' | 'wallpaper';

type LinkEntry = { url: string; sender: string; ts: number };

type Props = {
  username: string;
  chatId: string;
  onBack: () => void;
};

export default function UserProfileScreen({ username, chatId, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const slideX = useRef(new Animated.Value(-SCREEN_W)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [presence, setPresence] = useState<PresenceState | null>(null);
  const [tab, setTab] = useState<TabKey>('media');

  // Slide-in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideX, {
        toValue: 0,
        duration: 320,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.parallel([
      Animated.timing(slideX, {
        toValue: -SCREEN_W,
        duration: 240,
        easing: Easing.bezier(0.4, 0, 1, 1),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onBack());
  }, [onBack]);

  // Subscriptions
  useEffect(() => {
    const u1 = listenMessages(chatId, setMessages);
    const u2 = listenUserPresence(username, setPresence);
    return () => { u1(); u2(); };
  }, [chatId, username]);

  // Aggregations for tabs
  const { media, links, audio } = useMemo(() => {
    const m: Message[] = [];
    const l: LinkEntry[] = [];
    const a: Message[] = [];
    const re = /https?:\/\/[^\s]+/g;
    for (const msg of messages) {
      if (msg.image) m.push(msg);
      if (msg.audio) a.push(msg);
      if (msg.text) {
        const found = msg.text.match(re);
        if (found) for (const u of found) l.push({ url: u, sender: msg.sender, ts: msg.ts as number });
      }
    }
    // newest first
    m.reverse(); a.reverse(); l.reverse();
    return { media: m, links: l, audio: a };
  }, [messages]);

  // Swipe-right to close
  const dragX = useRef(new Animated.Value(0)).current;
  const onPanEvent = Animated.event([{ nativeEvent: { translationX: dragX } }], { useNativeDriver: true });
  const onPanState = useCallback((e: { nativeEvent: { state: number; translationX: number; velocityX: number } }) => {
    const { state, translationX, velocityX } = e.nativeEvent;
    if (state === GHState.END || state === GHState.CANCELLED) {
      if (translationX > SCREEN_W * 0.3 || velocityX > 800) {
        close();
      } else {
        Animated.timing(dragX, { toValue: 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      }
    }
  }, [close]);

  const avatarBg = getAvatarColor(username);
  const avatarChar = username.charAt(0).toUpperCase();

  const statusText = presence?.online ? 'онлайн' : formatLastSeen(presence?.lastSeenTs ?? null);
  const statusColor = presence?.online ? '#4CAF50' : theme.text2;

  const handleAudioCall = useCallback(async () => {
    try {
      await startCall(username);
      onBack();
    } catch (e: any) {
      Alert.alert('Не удалось позвонить', e?.message || 'Проверь доступ к микрофону и подключение.');
    }
  }, [username, onBack]);

  const showVideoStub = useCallback(() => {
    Alert.alert('В разработке', 'Видеозвонки появятся в следующем релизе (v4.9.0).');
  }, []);

  const showMediaStub = useCallback(() => {
    Alert.alert('В разработке', 'Полноэкранный просмотр медиа появится позже.');
  }, []);

  const renderTabContent = () => {
    if (tab === 'media') {
      if (!media.length) return <Text style={styles.empty}>Нет медиа</Text>;
      return (
        <View style={styles.grid}>
          {media.map((item) => (
            <TouchableOpacity key={item._key} style={styles.mediaTile} activeOpacity={0.8} onPress={showMediaStub}>
              <Image source={{ uri: item.image }} style={styles.mediaImg} />
            </TouchableOpacity>
          ))}
        </View>
      );
    }
    if (tab === 'files') {
      return <Text style={styles.empty}>Нет файлов</Text>;
    }
    if (tab === 'links') {
      if (!links.length) return <Text style={styles.empty}>Нет ссылок</Text>;
      return (
        <View style={styles.listContent}>
          {links.map((item, i) => {
            let domain = item.url;
            try { domain = new URL(item.url).hostname; } catch {}
            return (
              <TouchableOpacity key={item.url + '_' + i} style={styles.listRow} activeOpacity={0.7} onPress={() => Linking.openURL(item.url).catch(() => {})}>
                <View style={styles.listIconCircle}><Text style={styles.listIconEmoji}>🔗</Text></View>
                <View style={styles.listBody}>
                  <Text style={styles.listTitle} numberOfLines={1}>{domain}</Text>
                  <Text style={styles.listSubtitle} numberOfLines={1}>{item.url}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }
    if (tab === 'audio') {
      if (!audio.length) return <Text style={styles.empty}>Нет аудио</Text>;
      return (
        <View style={styles.listContent}>
          {audio.map((item) => {
            const date = new Date(item.ts as number);
            const dateStr = `${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getFullYear()).slice(2)}`;
            return (
              <View key={item._key} style={styles.listRow}>
                <View style={styles.listIconCircle}><Text style={styles.listIconEmoji}>🎵</Text></View>
                <View style={styles.listBody}>
                  <Text style={styles.listTitle}>Голосовое</Text>
                  <Text style={styles.listSubtitle}>{item.audioDur || ''} · {dateStr}</Text>
                </View>
              </View>
            );
          })}
        </View>
      );
    }
    if (tab === 'wallpaper') {
      return (
        <Text style={styles.empty}>Используйте меню ⋮ в чате → выбор темы</Text>
      );
    }
    return null;
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'media', label: 'Медиа' },
    { key: 'files', label: 'Файлы' },
    { key: 'links', label: 'Ссылки' },
    { key: 'audio', label: 'Музыка' },
    { key: 'wallpaper', label: 'Обои' },
  ];

  return (
    <Animated.View pointerEvents="box-none" style={[styles.absFill, { opacity }]}>
      <PanGestureHandler onGestureEvent={onPanEvent} onHandlerStateChange={onPanState} activeOffsetX={10}>
        <Animated.View style={[styles.container, { transform: [{ translateX: Animated.add(slideX, dragX) }] }]}>
          {/* Header bar */}
          <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={close} style={styles.headerBtn} activeOpacity={0.6}>
              <IconBack size={22} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Профиль</Text>
            <View style={styles.headerBtn} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {/* Top: avatar + name + status */}
            <View style={styles.topBlock}>
              <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
                <Text style={styles.avatarText}>{avatarChar}</Text>
              </View>
              <Text style={styles.name} numberOfLines={1}>{username}</Text>
              <Text style={[styles.status, { color: statusColor }]}>{statusText}</Text>
            </View>

            {/* Action buttons */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={close}>
                <IconChat size={22} color={theme.accent} />
                <Text style={styles.actionLabel}>Чат</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={handleAudioCall}>
                <IconPhone size={22} color={theme.accent} />
                <Text style={styles.actionLabel}>Звонок</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={showVideoStub}>
                <IconVideoCamera size={22} color={theme.accent} />
                <Text style={styles.actionLabel}>Видео</Text>
              </TouchableOpacity>
            </View>

            {/* Username row */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}><Text style={styles.infoIcon}>👤</Text></View>
              <View style={styles.infoBody}>
                <Text style={styles.infoValue}>@{username}</Text>
                <Text style={styles.infoLabel}>Имя пользователя</Text>
              </View>
            </View>

            {/* Tabs (sticky) */}
            <View style={styles.tabsBar}>
              {TABS.map((t) => {
                const active = tab === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.tabBtn, active && styles.tabBtnActive]}
                    activeOpacity={0.7}
                    onPress={() => setTab(t.key)}
                  >
                    <Text
                      style={[styles.tabText, active && styles.tabTextActive]}
                      numberOfLines={1}
                      allowFontScaling={false}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tab content */}
            <View style={styles.tabContent}>
              {renderTabContent()}
            </View>
          </ScrollView>
        </Animated.View>
      </PanGestureHandler>
    </Animated.View>
  );
}

const TILE_W = (SCREEN_W - 4) / 3;

const styles = StyleSheet.create({
  absFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 30 },
  container: { flex: 1, backgroundColor: theme.bg },

  headerBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingBottom: 8, gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border,
    backgroundColor: 'rgba(15,12,41,0.92)',
  },
  headerBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: theme.text, textAlign: 'center' },

  topBlock: { alignItems: 'center', paddingTop: 20, paddingBottom: 16 },
  avatar: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 48, color: '#fff', fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '600', color: theme.text, marginTop: 14 },
  status: { fontSize: 14, marginTop: 4 },

  actions: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 20 },
  actionBtn: {
    flex: 1, maxWidth: 110,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 12,
    alignItems: 'center', gap: 6,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)',
  },
  actionLabel: { fontSize: 12, color: theme.text, fontWeight: '500' },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border,
  },
  infoIconWrap: { width: 28, alignItems: 'center' },
  infoIcon: { fontSize: 20 },
  infoBody: { flex: 1, minWidth: 0 },
  infoValue: { fontSize: 15, color: theme.text },
  infoLabel: { fontSize: 12, color: theme.text2, marginTop: 1 },

  tabsBar: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: theme.bg,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: theme.accent },
  tabText: { fontSize: 14, color: theme.text2, fontWeight: '500' },
  tabTextActive: { color: theme.accent, fontWeight: '600' },

  tabContent: { flex: 1, minHeight: 200 },
  empty: { textAlign: 'center', color: theme.text3, fontSize: 13, paddingVertical: 40 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 1 },
  mediaTile: { width: TILE_W, height: TILE_W, padding: 1 },
  mediaImg: { width: '100%', height: '100%', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.04)' },

  listContent: { paddingVertical: 4 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  listIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(102,126,234,0.18)' },
  listIconEmoji: { fontSize: 18 },
  listBody: { flex: 1, minWidth: 0 },
  listTitle: { fontSize: 15, color: theme.text, fontWeight: '500' },
  listSubtitle: { fontSize: 12, color: theme.text2, marginTop: 2 },
});
