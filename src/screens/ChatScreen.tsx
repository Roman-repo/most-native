import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, Platform, Animated, Easing, Keyboard, Vibration, Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useAudioRecorder, useAudioRecorderState,
  requestRecordingPermissionsAsync, RecordingPresets, AudioModule,
} from 'expo-audio';
import { theme } from '../styles/theme';
import MessageBubble from '../components/MessageBubble';
import AvatarView from '../components/AvatarView';
import ReactionPicker from '../components/ReactionPicker';
import ForwardModal from '../components/ForwardModal';
import PinBar from '../components/PinBar';
import ThemePicker from '../components/ThemePicker';
import * as Clipboard from 'expo-clipboard';
import { IconBack, IconSmile, IconPaperclip, IconMic, IconSend, IconVideoNote, IconReplyBar, IconClose, IconCtxEdit, IconCheck, IconPhone } from '../components/Icons';
import ChatMenu, { type ChatMenuAction } from '../components/ChatMenu';
import { startCall } from '../services/CallManager';
import VideoRecorder from '../components/VideoRecorder';
import { sendVideoMsg, editMessage, deleteMessage, forwardMessage } from '../managers/ChatManager';
import EmojiPanel from '../components/EmojiPanel';
import { getChatTheme, setChatTheme, type ChatTheme } from '../utils/chatThemes';
import * as ImagePicker from 'expo-image-picker';
import { fileToBase64 } from '../managers/MediaManager';
import * as FileSystem from 'expo-file-system/legacy';
import { listenUserPresence, formatLastSeen, type PresenceState } from '../services/presence';
import { setTyping, stopTyping, listenTyping, formatTypingText } from '../services/typing';
import { markRead, listenReadReceipts } from '../services/readReceipts';
import TypingDots from '../components/TypingDots';
import {
  listenMessages, sendMessage, sendAudio, sendSticker, sendAnimSticker,
  toggleReaction, listenPins, togglePin,
  type Message, type PinInfo,
} from '../managers/ChatManager';

const BAR_COUNT = 24;
const EMOJI_PANEL_HEIGHT = 300;

type Props = {
  chatId: string;
  chatName: string;
  user: string;
  isGroup: boolean;
  onBack: () => void;
  onOpenPrivate?: (otherUser: string) => void;
  onOpenProfile?: (otherUser: string) => void;
};

type ReplyInfo = { sender: string; text: string };

const AVATAR_COLORS = ['#E85D75','#6C5CE7','#00B894','#FDCB6E','#E17055','#0984E3','#A29BFE','#55EFC4'];
function getAvatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}


export default function ChatScreen({ chatId, chatName, user, isGroup, onBack, onOpenPrivate, onOpenProfile }: Props) {
  const insets = useSafeAreaInsets();
  const inbBottomPad = Platform.OS === 'android' ? 6 : Math.max(insets.bottom, 20);
  // — Chat state —
  const [messages, setMessages] = useState<Message[]>([]);
  const [pins, setPins] = useState<PinInfo[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ReplyInfo | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [editMsg, setEditMsg] = useState<Message | null>(null);
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [chatTheme, setChatThemeState] = useState<ChatTheme | null>(null);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const isNearBottomRef = useRef(true);
  const pinIndexRef = useRef(0);
  const listOpacity = useRef(new Animated.Value(0)).current;
  const initialLoadRef = useRef(false);

  // — Recording mode: audio | video (tap mic to toggle) —
  const [recordMode, setRecordMode] = useState<'audio' | 'video'>('audio');
  const [videoRecording, setVideoRecording] = useState(false);

  // — Recording state (inline, like web inwRec) —
  const [recording, setRecording] = useState(false);
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(4));
  const [displayTime, setDisplayTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deciseconds = useRef(0);
  const urlRef = useRef<string | null>(null);
  const dotAnim = useRef(new Animated.Value(1)).current;
  const dotLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // — Edit mode: saves text that was in input before edit started —
  const prevTextRef = useRef('');

  // — Mic hold logic —
  const micHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // — expo-audio recorder —
  const recorder = useAudioRecorder(
    { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true },
    (status) => { if (status.url) urlRef.current = status.url; },
  );
  const recState = useAudioRecorderState(recorder, 80);

  // — Emoji / keyboard animation —
  const emojiTranslate = useRef(new Animated.Value(EMOJI_PANEL_HEIGHT)).current; // hidden below by default
  const bottomPad = useRef(new Animated.Value(0)).current; // shared: keyboard OR emoji
  const emojiAnimating = useRef(false);
  const emojiOpenRef = useRef(false);
  const kbHeightRef = useRef(0);

  // — Metering → wave bars —
  useEffect(() => {
    if (!recording) return;
    if (recState.metering !== undefined) {
      const norm = Math.max(0, (recState.metering + 60) / 60);
      setBars(prev => [...prev.slice(1), Math.max(4, Math.round(norm * 28))]);
    }
  }, [recState.metering, recording]);

  useEffect(() => {
    const unsubMsgs = listenMessages(chatId, (newMessages) => {
      setMessages(newMessages);
    });
    const unsubPins = listenPins(chatId, setPins);
    getChatTheme(chatId).then(setChatThemeState);
    return () => { unsubMsgs(); unsubPins(); };
  }, [chatId]);

  useEffect(() => {
    if (messages.length === 0) return;
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      Animated.timing(listOpacity, {
        toValue: 1, duration: 250, useNativeDriver: true,
      }).start();
    }
  }, [messages.length]);

  const prevCountRef = useRef(0);
  const handleContentSizeChange = useCallback(() => {
    const count = messages.length;
    if (count > prevCountRef.current && prevCountRef.current > 0 && isNearBottomRef.current) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
    prevCountRef.current = count;
  }, [messages.length]);


  const openEmoji = useCallback(() => {
    if (emojiAnimating.current) return;
    emojiAnimating.current = true;
    emojiOpenRef.current = true;
    Keyboard.dismiss();
    setEmojiOpen(true);
    Animated.parallel([
      Animated.timing(emojiTranslate, {
        toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(bottomPad, {
        toValue: EMOJI_PANEL_HEIGHT, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: false,
      }),
    ]).start(() => { emojiAnimating.current = false; });
  }, [emojiTranslate, bottomPad]);

  const closeEmoji = useCallback(() => {
    if (emojiAnimating.current) return;
    emojiAnimating.current = true;
    emojiOpenRef.current = false;
    const targetPad = kbHeightRef.current; // keyboard may be about to show
    Animated.parallel([
      Animated.timing(emojiTranslate, {
        toValue: EMOJI_PANEL_HEIGHT, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(bottomPad, {
        toValue: targetPad, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: false,
      }),
    ]).start(() => { emojiAnimating.current = false; setEmojiOpen(false); });
  }, [emojiTranslate, bottomPad]);

  // — Smooth keyboard tracking (replaces KeyboardAvoidingView) —
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => {
      const h = e.endCoordinates?.height ?? 0;
      kbHeightRef.current = h;
      if (emojiOpenRef.current) {
        // keyboard opened over emoji (user tapped input) → close emoji, settle at kb height
        closeEmoji();
        return;
      }
      const dur = Platform.OS === 'ios' ? (e.duration || 250) : 240;
      Animated.timing(bottomPad, {
        toValue: h, duration: dur, easing: Easing.out(Easing.cubic), useNativeDriver: false,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvt, (e) => {
      kbHeightRef.current = 0;
      if (emojiOpenRef.current) return; // emoji is managing bottomPad
      const dur = Platform.OS === 'ios' ? (e.duration || 250) : 200;
      Animated.timing(bottomPad, {
        toValue: 0, duration: dur, easing: Easing.out(Easing.cubic), useNativeDriver: false,
      }).start();
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, [bottomPad, closeEmoji]);

  const handlePinPress = useCallback(() => {
    if (!pins.length) return;
    const idx = pinIndexRef.current % pins.length;
    pinIndexRef.current = idx + 1;
    const msgIndex = messages.findIndex(m => m._key === pins[idx].key);
    if (msgIndex >= 0) {
      flatListRef.current?.scrollToIndex({ index: msgIndex, animated: true, viewPosition: 0.3 });
    }
  }, [pins, messages]);

  const recorderReadyRef = useRef(false);
  const justStartedRef = useRef(false);
  const didHoldRef = useRef(false);

  // — Start recording (called after 500ms hold) —
  const startRecording = useCallback(async () => {
    urlRef.current = null;
    deciseconds.current = 0;
    recorderReadyRef.current = false;
    justStartedRef.current = true;
    setTimeout(() => { justStartedRef.current = false; }, 600);
    setBars(Array(BAR_COUNT).fill(4));
    setDisplayTime(0);
    setRecording(true);

    // dot pulse
    dotLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1.4, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    dotLoopRef.current.start();

    // timer
    timerRef.current = setInterval(() => {
      deciseconds.current += 1;
      setDisplayTime(d => d + 1);
    }, 100);

    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) { stopRecordingCleanup(); setRecording(false); return; }
      await AudioModule.setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      recorderReadyRef.current = true;
    } catch (e) {
      console.error('[startRecording]', e);
      stopRecordingCleanup();
      setRecording(false);
    }
  }, [recorder, dotAnim]);

  const stopRecordingCleanup = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (dotLoopRef.current) { dotLoopRef.current.stop(); dotLoopRef.current = null; }
    dotAnim.setValue(1);
  };

  // — Send recording —
  const handleSendAudio = useCallback(async () => {
    if (justStartedRef.current) return;
    const durationSec = Math.floor(deciseconds.current / 10);
    stopRecordingCleanup();
    setRecording(false);
    if (recorderReadyRef.current) {
      try { await recorder.stop(); } catch (e) { console.warn('[handleSendAudio] stop:', e); }
    }
    const uri = urlRef.current ?? recorder.uri;
    if (!uri || durationSec < 1) return;
    try {
      const dataUrl = await fileToBase64(uri);
      await sendAudio(chatId, user, dataUrl, durationSec);
    } catch (e) {
      console.error('[handleSendAudio] send:', e);
    }
  }, [recorder, chatId, user]);

  // — Cancel recording —
  const handleCancelAudio = useCallback(() => {
    stopRecordingCleanup();
    setRecording(false);
    if (recorderReadyRef.current) {
      recorder.stop().catch(() => {});
    }
  }, [recorder]);

  // — Send video —
  const handleSendVideo = useCallback(async (uri: string, duration: number) => {
    const MAX_BASE64_BYTES = 9 * 1024 * 1024; // 9 MB в base64 (лимит RTDB = 10 MB)
    const MAX_BINARY_BYTES = Math.floor(MAX_BASE64_BYTES * 0.75); // base64 раздувает на 33%
    try {
      const info = await FileSystem.getInfoAsync(uri, { size: true });
      if (info.exists && typeof info.size === 'number' && info.size > MAX_BINARY_BYTES) {
        Alert.alert(
          'Видео слишком большое',
          `Размер ${(info.size / 1024 / 1024).toFixed(1)} МБ. Максимум — ${(MAX_BINARY_BYTES / 1024 / 1024).toFixed(0)} МБ. Запишите видео короче.`,
        );
        return;
      }
      const dataUrl = await fileToBase64(uri, 'video/mp4');
      await sendVideoMsg(chatId, user, dataUrl, duration);
    } catch (e) {
      console.error('[handleSendVideo]', e);
      Alert.alert('Ошибка отправки видео', String(e));
    } finally {
      setVideoRecording(false);
    }
  }, [chatId, user]);

  // — Mic button hold —
  const handleMicPressIn = useCallback(() => {
    didHoldRef.current = false;
    micHoldTimer.current = setTimeout(() => {
      didHoldRef.current = true;
      Vibration.vibrate(50);
      if (recordMode === 'audio') {
        startRecording();
      } else {
        setVideoRecording(true);
      }
    }, 300);
  }, [startRecording, recordMode]);

  const handleMicPressOut = useCallback(() => {
    if (micHoldTimer.current) {
      clearTimeout(micHoldTimer.current);
      micHoldTimer.current = null;
    }
    if (!didHoldRef.current) {
      // Short tap → toggle audio/video mode
      setRecordMode(m => m === 'audio' ? 'video' : 'audio');
    }
    didHoldRef.current = false;
  }, []);

  // — Send text —
  const handleSend = useCallback(async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    stopTyping(chatId, user);
    const reply = replyTo;
    setReplyTo(null);
    await sendMessage(chatId, user, t, reply ?? undefined);
  }, [text, chatId, user, replyTo]);

  // — Pick image —
  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    try {
      const dataUrl = await fileToBase64(result.assets[0].uri, 'image/jpeg');
      const { push, ref, serverTimestamp, update } = await import('firebase/database');
      const { db } = await import('../services/firebase');
      await push(ref(db, 'messages/' + chatId), { sender: user, image: dataUrl, ts: serverTimestamp() });
      await update(ref(db, 'chats/' + chatId), { lastText: '📷 Фото', lastTs: serverTimestamp() });
    } catch (e) {
      console.error('[handlePickImage]', e);
    }
  }, [chatId, user]);

  const handleLongPress = useCallback((msg: Message) => {
    setSelectedMsg(msg); setPickerVisible(true);
  }, []);

  const handleReply = useCallback((msg: Message) => {
    setReplyTo({ sender: msg.sender, text: msg.text || '' });
  }, []);

  const handleReact = useCallback(async (emoji: string) => {
    if (!selectedMsg) return;
    await toggleReaction(chatId, selectedMsg._key, user, emoji);
  }, [selectedMsg, chatId, user]);

  const handleReactionPress = useCallback(async (msgKey: string, emoji: string) => {
    await toggleReaction(chatId, msgKey, user, emoji);
  }, [chatId, user]);

  const handlePin = useCallback(async () => {
    if (!selectedMsg) return;
    await togglePin(chatId, selectedMsg._key);
  }, [selectedMsg, chatId]);

  const handleCopy = useCallback(async () => {
    if (!selectedMsg?.text) return;
    await Clipboard.setStringAsync(selectedMsg.text);
  }, [selectedMsg]);

  const handleForward = useCallback(() => {
    if (!selectedMsg) return;
    setForwardMsg(selectedMsg);
  }, [selectedMsg]);

  const handleEdit = useCallback(() => {
    if (!selectedMsg?.text) return;
    const msg = selectedMsg;
    prevTextRef.current = text;
    setTimeout(() => {
      setEditMsg(msg);
      setText(msg.text ?? '');
    }, 220);
  }, [selectedMsg, text]);

  const handleDelete = useCallback(async () => {
    if (!selectedMsg) return;
    await deleteMessage(chatId, selectedMsg._key);
  }, [selectedMsg, chatId]);

  const handlePrivate = useCallback(() => {
    if (!selectedMsg || !onOpenPrivate) return;
    onOpenPrivate(selectedMsg.sender);
  }, [selectedMsg, onOpenPrivate]);

  const handleEditSubmit = useCallback(async () => {
    if (!editMsg) return;
    const t = text.trim();
    if (!t) return;
    const msg = editMsg;
    setEditMsg(null);
    setText('');
    await editMessage(chatId, msg._key, t);
  }, [editMsg, text, chatId]);

  const handleEditCancel = useCallback(() => {
    setText(prevTextRef.current);
    prevTextRef.current = '';
    setEditMsg(null);
  }, []);

  const handleForwardPick = useCallback(async (targetChatId: string) => {
    if (!forwardMsg) return;
    await forwardMessage(targetChatId, user, forwardMsg);
    setForwardMsg(null);
  }, [forwardMsg, user]);

  const handleThemeSelect = useCallback(async (t: ChatTheme | null) => {
    setChatThemeState(t);
    await setChatTheme(chatId, t);
  }, [chatId]);

  const handleChatMenuPick = useCallback((action: ChatMenuAction) => {
    setChatMenuOpen(false);
    if (action === 'videoCall') {
      startCall(chatName, true).catch(() => {});
    } else if (action === 'wallpaper') {
      setThemePickerOpen(true);
    }
  }, [chatName]);

  const isGeneralChat = chatId === 'general';
  const [otherPresence, setOtherPresence] = useState<PresenceState | null>(null);
  useEffect(() => {
    if (isGeneralChat || isGroup || !chatName) return;
    const unsub = listenUserPresence(chatName, setOtherPresence);
    return unsub;
  }, [chatName, isGeneralChat, isGroup]);

  const [typers, setTypers] = useState<string[]>([]);
  useEffect(() => {
    if (!chatId || !user) return;
    const unsub = listenTyping(chatId, user, setTypers);
    return unsub;
  }, [chatId, user]);

  const [maxOtherReadTs, setMaxOtherReadTs] = useState(0);
  useEffect(() => {
    if (!chatId || !user) return;
    const unsub = listenReadReceipts(chatId, user, setMaxOtherReadTs);
    return unsub;
  }, [chatId, user]);

  useEffect(() => {
    if (!chatId || !user) return;
    markRead(chatId, user);
  }, [chatId, user, messages.length]);

  useEffect(() => {
    return () => { stopTyping(chatId, user); };
  }, [chatId, user]);

  const handleChangeText = useCallback((t: string) => {
    setText(t);
    if (t.length > 0) setTyping(chatId, user);
    else stopTyping(chatId, user);
  }, [chatId, user]);

  // showSender вычисляем отдельно, не встраивая в объекты сообщений
  const showSenderMap = useMemo(() => {
    const map = new Map<string, boolean>();
    let prevSender: string | null = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const showSender = (isGroup || isGeneralChat) && (prevSender !== msg.sender);
      map.set(msg._key, showSender);
      prevSender = msg.sender;
    }
    return map;
  }, [messages, isGroup, isGeneralChat]);

  const renderItem = useCallback(({ item }: { item: Message }) => (
    <MessageBubble
      message={item}
      isMe={item.sender === user}
      isRead={item.sender === user && typeof item.ts === 'number' && item.ts > 0 && item.ts <= maxOtherReadTs}
      showSender={showSenderMap.get(item._key) ?? false}
      onLongPress={handleLongPress}
      onReactionPress={handleReactionPress}
      onReply={handleReply}
      bubbleColor={chatTheme?.acc}
      peer={!isGroup && !isGeneralChat ? chatName : undefined}
    />
  ), [user, showSenderMap, handleLongPress, handleReactionPress, handleReply, chatTheme, maxOtherReadTs, isGroup, isGeneralChat, chatName]);

  const keyExtractor = useCallback((item: Message) => item._key, []);


  const avatarBg = isGeneralChat ? theme.accent : isGroup ? '#00B894' : getAvatarColor(chatName);
  const avatarChar = isGeneralChat ? '💬' : isGroup ? '👥' : chatName.charAt(0).toUpperCase();
  const hasText = text.trim().length > 0;
  const accentColor = chatTheme?.acc ?? theme.accent;

  // Timer display
  const d = displayTime;
  const timerLabel = `${Math.floor(d / 600)}:${String(Math.floor(d / 10) % 60).padStart(2, '0')},${d % 10}`;

  return (
    <GestureHandlerRootView style={[styles.container, chatTheme && { backgroundColor: '#0a0a1a' }]}>
      <Animated.View style={[styles.content, { paddingBottom: bottomPad }]}>
        {/* Header */}
        <BlurView intensity={60} tint="dark" style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.headerBtn} activeOpacity={0.6}>
            <IconBack size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerCenter}
            activeOpacity={0.7}
            disabled={isGeneralChat || isGroup || !onOpenProfile}
            onPress={() => onOpenProfile && onOpenProfile(chatName)}
          >
            {isGeneralChat || isGroup ? (
              <View style={[styles.headerAvatar, { backgroundColor: avatarBg }]}>
                <Text style={styles.headerAvatarText}>{avatarChar}</Text>
              </View>
            ) : (
              <AvatarView user={chatName} size={40} fontSize={17} />
            )}
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle} numberOfLines={1}>{chatName}</Text>
              {typers.length > 0 ? (
                <View style={styles.headerSubRow}>
                  <Text style={[styles.headerSub, styles.headerSubTyping]} numberOfLines={1}>
                    {isGeneralChat || isGroup
                      ? formatTypingText(typers, true)
                      : 'печатает'}
                  </Text>
                  <TypingDots color="#4CAF50" />
                </View>
              ) : (
                <Text style={[styles.headerSub, !isGeneralChat && !isGroup && otherPresence?.online && styles.headerSubOnline]}>
                  {isGeneralChat || isGroup
                    ? 'групповой чат'
                    : otherPresence?.online
                      ? 'онлайн'
                      : formatLastSeen(otherPresence?.lastSeenTs ?? null)}
                </Text>
              )}
            </View>
          </TouchableOpacity>
          {!isGeneralChat && !isGroup && (
            <TouchableOpacity
              style={styles.headerBtn}
              activeOpacity={0.6}
              onPress={() => startCall(chatName, false).catch(() => {})}
            >
              <IconPhone size={20} color={theme.text} />
            </TouchableOpacity>
          )}
          {!isGeneralChat && (
            <TouchableOpacity style={styles.headerBtn} activeOpacity={0.6} onPress={() => setChatMenuOpen(true)}>
              <Text style={styles.menuDots}>⋮</Text>
            </TouchableOpacity>
          )}
        </BlurView>

        {/* Pin bar */}
        <View style={styles.pinBarWrap}>
          <PinBar pins={pins} onPress={handlePinPress} />
        </View>

        {/* Messages + reply bar (absolute поверх списка) */}
        <Animated.View style={[styles.listWrap, { opacity: listOpacity }]}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            inverted
            onScroll={(e) => {
              isNearBottomRef.current = e.nativeEvent.contentOffset.y < 80;
            }}
            scrollEventThrottle={16}
            onContentSizeChange={handleContentSizeChange}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            style={styles.list}
            contentContainerStyle={[styles.listContent, replyTo ? { paddingBottom: 60 } : undefined]}
            maxToRenderPerBatch={8}
            windowSize={7}
            initialNumToRender={15}
            removeClippedSubviews={true}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>Начните общение 👋</Text>
              </View>
            }
          />
        </Animated.View>

        {editMsg && (
          <View style={styles.editBar}>
            <IconCtxEdit size={28} color={theme.accent} />
            <View style={styles.editBarContent}>
              <Text style={styles.editBarLabel}>Редактирование</Text>
              <Text style={styles.editBarMedia}>Нажмите, чтобы загрузить медиа</Text>
            </View>
            <TouchableOpacity onPress={handleEditCancel} style={styles.editBarClose}>
              <IconClose size={16} color={theme.text2} />
            </TouchableOpacity>
          </View>
        )}

        {replyTo && (
          <View style={styles.replyBar}>
            <View style={styles.replyBarIcon}>
              <IconReplyBar size={18} color={theme.accent} />
            </View>
            <View style={styles.replyBarContent}>
              <Text style={styles.replyBarAuthor} numberOfLines={1}>В ответ {replyTo.sender}</Text>
              <Text style={styles.replyBarText} numberOfLines={1}>{replyTo.text || '📷'}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyBarClose}>
              <IconClose size={16} color={theme.text2} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar — always rendered. TextInput stays mounted to keep keyboard open during recording. */}
        <View style={[styles.inb, { paddingBottom: inbBottomPad }]}>
          <View style={styles.inwWrap}>
            {/* inwNormal — always mounted (keeps TextInput focus & keyboard) */}
            <View style={styles.inw}>
              <TouchableOpacity style={styles.ini} activeOpacity={0.6} onPress={emojiOpen ? closeEmoji : openEmoji}>
                <IconSmile size={22} color={emojiOpen ? theme.accent : 'rgba(255,255,255,0.6)'} />
              </TouchableOpacity>
              <TextInput
                style={styles.min}
                placeholder="Сообщение"
                placeholderTextColor={theme.text3}
                value={text}
                onChangeText={handleChangeText}
                multiline
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity style={styles.ini} activeOpacity={0.6} onPress={handlePickImage} disabled={recording}>
                <IconPaperclip size={22} color='rgba(255,255,255,0.6)' />
              </TouchableOpacity>
            </View>
            {/* inwRec — overlay on top while recording */}
            {recording && (
              <View style={[styles.inw, styles.inwRecOverlay]}>
                <Animated.View style={[styles.recDot, { transform: [{ scale: dotAnim }] }]} />
                <Text style={styles.recTimer}>{timerLabel}</Text>
                <View style={styles.recWave}>
                  {bars.map((h, i) => <View key={i} style={[styles.recBar, { height: h }]} />)}
                </View>
                <TouchableOpacity onPress={handleCancelAudio} style={styles.recCancelBtn} activeOpacity={0.7} delayPressIn={0}>
                  <Text style={styles.recCancelText}>ОТМЕНА</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Right button — always same position (web: rb-main / sbb) */}
          {editMsg ? (
            <TouchableOpacity
              style={[styles.roundBtn, styles.sbBtn, { backgroundColor: accentColor, shadowColor: accentColor }]}
              onPress={handleEditSubmit}
              activeOpacity={0.8}
            >
              <IconCheck size={20} color="#fff" />
            </TouchableOpacity>
          ) : recording ? (
            <TouchableOpacity
              style={[styles.roundBtn, styles.sbBtn, { backgroundColor: accentColor, shadowColor: accentColor }]}
              onPress={handleSendAudio}
              activeOpacity={0.8}
              delayPressIn={0}
            >
              <IconSend size={18} color="#fff" />
            </TouchableOpacity>
          ) : hasText ? (
            <TouchableOpacity
              style={[styles.roundBtn, styles.sbBtn, { backgroundColor: accentColor, shadowColor: accentColor }]}
              onPress={handleSend}
              activeOpacity={0.8}
            >
              <IconSend size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.roundBtn, styles.micBtn]}
              activeOpacity={0.8}
              onPressIn={handleMicPressIn}
              onPressOut={handleMicPressOut}
            >
              {recordMode === 'audio'
                ? <IconMic size={22} color="#fff" />
                : <IconVideoNote size={22} color="#fff" />
              }
            </TouchableOpacity>
          )}
        </View>

        <ReactionPicker
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          onReact={handleReact}
          onReply={() => selectedMsg && handleReply(selectedMsg)}
          onPin={handlePin}
          onCopy={selectedMsg?.text ? handleCopy : undefined}
          onForward={handleForward}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPrivate={isGeneralChat && selectedMsg && selectedMsg.sender !== user ? handlePrivate : undefined}
          isMe={selectedMsg?.sender === user}
          isPinned={!!(selectedMsg && pins.some(p => p.key === selectedMsg._key))}
          canEdit={!!selectedMsg?.text}
          canPrivate={!!(isGeneralChat && selectedMsg && selectedMsg.sender !== user && onOpenPrivate)}
        />


        <ForwardModal
          visible={!!forwardMsg}
          user={user}
          excludeChatId={chatId}
          onClose={() => setForwardMsg(null)}
          onPick={handleForwardPick}
        />

        {themePickerOpen && (
          <ThemePicker
            current={chatTheme}
            onSelect={handleThemeSelect}
            onClose={() => setThemePickerOpen(false)}
          />
        )}

        {chatMenuOpen && (
          <ChatMenu
            canVideoCall={!isGeneralChat && !isGroup}
            onPick={handleChatMenuPick}
            onClose={() => setChatMenuOpen(false)}
          />
        )}

        {/* Video recording overlay */}
        {videoRecording && (
          <VideoRecorder
            onSend={handleSendVideo}
            onCancel={() => setVideoRecording(false)}
          />
        )}
      </Animated.View>

      {/* Emoji panel: absolute at bottom, slides up via translateY (native driver) */}
      <Animated.View
        pointerEvents={emojiOpen ? 'auto' : 'none'}
        style={[
          styles.emojiPanelAbs,
          { height: EMOJI_PANEL_HEIGHT, transform: [{ translateY: emojiTranslate }] },
        ]}
      >
        <EmojiPanel
          onEmoji={(e) => setText(t => t + e)}
          onSticker={(s) => { closeEmoji(); sendSticker(chatId, user, s); }}
          onAnimSticker={(id) => { closeEmoji(); sendAnimSticker(chatId, user, id); }}
        />
      </Animated.View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { flex: 1 },
  emojiPanelAbs: { position: 'absolute', left: 0, right: 0, bottom: 0 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 50, paddingBottom: 8, paddingHorizontal: 10, gap: 8,
    borderBottomWidth: 1, borderBottomColor: theme.border, overflow: 'hidden',
  },
  menuDots: { fontSize: 22, color: theme.text, lineHeight: 26 },
  pinBarWrap: { overflow: 'hidden', backgroundColor: 'rgba(15,12,41,0.82)' },
  headerBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  headerAvatarText: { fontSize: 17, color: '#fff', fontWeight: '700' },
  headerInfo: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: theme.text },
  headerSub: { fontSize: 13, color: theme.text2, marginTop: 1 },
  headerSubOnline: { color: '#4CAF50' },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  headerSubTyping: { color: '#4CAF50', marginTop: 0 },

  listWrap: { flex: 1 },
  list: { flex: 1 },
  listContent: { paddingVertical: 12, gap: 3 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: theme.text3, fontSize: 15 },

  editBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: theme.border,
    gap: 8,
    backgroundColor: 'rgba(15,12,41,0.82)',
  },
  editBarContent: { flex: 1, minWidth: 0 },
  editBarLabel: { fontSize: 13, color: theme.accent, fontWeight: '700', marginBottom: 1 },
  editBarMedia: { fontSize: 12, color: theme.text2 },
  editBarClose: { padding: 4, flexShrink: 0 },

  /* .rb — gap:8, padding:8 12, background:--bg2, border-top:--brd */
  replyBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: theme.border,
    gap: 8,
    backgroundColor: 'rgba(15,12,41,0.82)',
  },
  replyBarIcon: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  replyBarContent: { flex: 1, minWidth: 0 },
  replyBarAuthor: { fontSize: 13, color: theme.accent, fontWeight: '700', marginBottom: 1 },
  replyBarText: { fontSize: 13, color: theme.text2 },
  replyBarClose: { padding: 4, flexShrink: 0 },

  /* inb — always-rendered input bar container */
  inb: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 6,
    backgroundColor: 'rgba(15,12,41,0.78)',
    borderTopWidth: 1, borderTopColor: theme.border, gap: 8,
  },

  /* wrapper for stacked normal+rec */
  inwWrap: { flex: 1, position: 'relative' },

  /* inw — pill that switches content */
  inw: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22, borderWidth: 1,
    borderColor: 'rgba(102,126,234,0.2)',
    paddingHorizontal: 6, minHeight: 44,
  },
  inwRecOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,12,41,0.98)',
  },

  /* Normal state elements */
  ini: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  min: {
    flex: 1, backgroundColor: 'transparent', color: theme.text,
    fontSize: 16, lineHeight: 21, paddingHorizontal: 4, paddingVertical: 10,
    maxHeight: 120, fontFamily: Platform.OS === 'android' ? 'Roboto' : undefined,
  },

  /* Recording state elements (inwRec) */
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E85D75', marginHorizontal: 6, flexShrink: 0 },
  recTimer: { fontSize: 14, fontWeight: '600', color: theme.text, fontVariant: ['tabular-nums'], minWidth: 52, flexShrink: 0 },
  recWave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 32, overflow: 'hidden', marginHorizontal: 4 },
  recBar: { width: 3, backgroundColor: '#E85D75', borderRadius: 2, minHeight: 4 },
  recCancelBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  recCancelText: { color: theme.accent, fontSize: 13, fontWeight: '500', letterSpacing: 0.5 },

  /* Right buttons */
  roundBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  micBtn: {
    backgroundColor: '#5b7cfa',
    shadowColor: '#5b7cfa', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 4,
  },
  sbBtn: {
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
});
