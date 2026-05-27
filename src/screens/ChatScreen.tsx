import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Platform, Animated, Easing, Keyboard, Vibration, Alert,
  type NativeSyntheticEvent, type NativeScrollEvent,
} from 'react-native';
import { ScrollView } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, Easing as REasing, FadeIn } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useAudioRecorder, useAudioRecorderState,
  requestRecordingPermissionsAsync, RecordingPresets, AudioModule,
} from 'expo-audio';
import { theme } from '../styles/theme';
import MessageBubble from '../components/MessageBubble';
import ThanosSnap from '../components/ThanosSnap';
import AvatarView from '../components/AvatarView';
import ReactionPicker from '../components/ReactionPicker';
import ForwardModal, { type ForwardTarget } from '../components/ForwardModal';
import PinBar from '../components/PinBar';
import ThemePicker from '../components/ThemePicker';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { IconBack, IconSmile, IconPaperclip, IconMic, IconSend, IconVideoNote, IconReplyBar, IconClose, IconCtxEdit, IconCheck, IconPhone } from '../components/Icons';
import ChatMenu, { type ChatMenuAction } from '../components/ChatMenu';
import Toast from '../components/Toast';
import { startCall } from '../services/CallManager';
import VideoRecorder from '../components/VideoRecorder';
import { sendVideoMsg, editMessage, deleteMessage, forwardMessage } from '../managers/ChatManager';
import EmojiPanel from '../components/EmojiPanel';
import { getChatTheme, setChatTheme, type ChatTheme } from '../utils/chatThemes';
import { ANIM_STICKERS } from '../utils/emoji';
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

// Module-level animation descriptors — same reference across renders to avoid Reanimated re-triggering
const ENTER_ANIM = FadeIn.duration(220);
const SCROLL_LOCK_AFTER_DELETE_MS = 600;

type Props = {
  chatId: string;
  chatName: string;
  user: string;
  isGroup: boolean;
  onBack: () => void;
  onOpenPrivate?: (otherUser: string) => void;
  onOpenProfile?: (otherUser: string) => void;
  onNavigateToChat?: (chatId: string, chatName: string, isGroup: boolean) => void;
  onOpenGallery?: (images: string[], index: number) => void;
};

type ReplyInfo = { sender: string; text: string };

const AVATAR_COLORS = ['#E85D75','#6C5CE7','#00B894','#FDCB6E','#E17055','#0984E3','#A29BFE','#55EFC4'];
function getAvatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function MessageSeparator() {
  return <View style={separatorStyle} />;
}
const separatorStyle = { height: 3 };

function ChatEmpty() {
  return (
    <View style={emptyWrapStyle}>
      <Text style={emptyTextStyle}>Начните общение 👋</Text>
    </View>
  );
}
const emptyWrapStyle = { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, paddingTop: 60 };
const emptyTextStyle = { color: theme.text3, fontSize: 15 };



export default function ChatScreen({ chatId, chatName, user, isGroup, onBack, onOpenPrivate, onOpenProfile, onNavigateToChat, onOpenGallery }: Props) {
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
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [pendingSticker, setPendingSticker] = useState<string | null>(null);
  const [pendingAnimSticker, setPendingAnimSticker] = useState<string | null>(null);
  // — Layout heights for absolute-positioned bars (so BlurView overlays the message list) —
  const [headerH, setHeaderH] = useState(0);
  const [pinH, setPinH] = useState(0);
  const [editH, setEditH] = useState(0);
  const [replyH, setReplyH] = useState(0);
  const [inputH, setInputH] = useState(0);
  const [deletingKeys, setDeletingKeys] = useState<Set<string>>(new Set());
  const scrollViewRef = useRef<ScrollView>(null);
  const msgPositionsRef = useRef<Map<string, number>>(new Map());
  const isNearBottomRef = useRef(true);
  const pinIndexRef = useRef(0);
  const listOpacity = useRef(new Animated.Value(0)).current;
  const initialLoadRef = useRef(false);
  // Pagination
  const [pageSize, setPageSize] = useState(50);
  const [hasMore, setHasMore] = useState(true);
  const paginationCooldownRef = useRef(false);
  // Track keys we've already rendered, so entering animation only fires for freshly arrived messages
  const seenKeysRef = useRef<Set<string>>(new Set());
  const newlyAddedKeysRef = useRef<Set<string>>(new Set());
  const initialScrollDoneRef = useRef(false);
  const prevContentHeightRef = useRef(0);
  const lastBottomTsRef = useRef(0);
  const scrollLockUntilRef = useRef(0);
  // Map of msgKey → outer View ref of MessageBubble (for singleton ThanosSnap to capture)
  const bubbleRefsMap = useRef<Map<string, any>>(new Map());
  const [thanosTargetKey, setThanosTargetKey] = useState<string | null>(null);
  // Re-render trigger when refs map changes (so singleton ThanosSnap re-evaluates)
  const [, setBubbleRefsTick] = useState(0);

  const registerBubbleRef = useCallback((key: string, ref: any) => {
    if (ref) bubbleRefsMap.current.set(key, ref);
    else bubbleRefsMap.current.delete(key);
    setBubbleRefsTick(t => t + 1);
  }, []);

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
  const bottomPad = useSharedValue(0); // shared: keyboard OR emoji — Reanimated for UI-thread layout anim
  const contentAnimStyle = useAnimatedStyle(() => ({ paddingBottom: bottomPad.value }));
  const emojiAnimating = useRef(false);
  const emojiOpenRef = useRef(false);

  // — Metering → wave bars —
  useEffect(() => {
    if (!recording) return;
    if (recState.metering !== undefined) {
      const norm = Math.max(0, (recState.metering + 60) / 60);
      setBars(prev => [...prev.slice(1), Math.max(4, Math.round(norm * 28))]);
    }
  }, [recState.metering, recording]);

  useEffect(() => {
    console.log('[Sub] listenMessages SUBSCRIBE chatId=', chatId, 'pageSize=', pageSize);
    const unsubMsgs = listenMessages(chatId, setMessages, pageSize);
    return () => {
      console.log('[Sub] listenMessages UNSUBSCRIBE chatId=', chatId, 'pageSize=', pageSize);
      unsubMsgs();
    };
  }, [chatId, pageSize]);

  useEffect(() => {
    const unsubPins = listenPins(chatId, setPins);
    getChatTheme(chatId).then(setChatThemeState);
    return () => { unsubPins(); };
  }, [chatId]);

  // Reset pagination state when switching chats
  useEffect(() => {
    console.log('[Reset] chatId effect FIRED — resetting pageSize=50, scrollLock=0. chatId=', chatId);
    setPageSize(50);
    setHasMore(true);
    seenKeysRef.current = new Set();
    newlyAddedKeysRef.current = new Set();
    paginationCooldownRef.current = false;
    initialLoadRef.current = false;
    initialScrollDoneRef.current = false;
    prevContentHeightRef.current = 0;
    lastBottomTsRef.current = 0;
    scrollLockUntilRef.current = 0;
    listOpacity.setValue(0);
  }, [chatId]);

  // Detect ChatScreen mount/unmount (different from chatId effect — this fires on actual mount)
  useEffect(() => {
    console.log('[Mount] ChatScreen MOUNTED');
    return () => { console.log('[Mount] ChatScreen UNMOUNTED'); };
  }, []);

  // Detect newly arrived keys (vs. previously seen) before render reads them.
  // useMemo runs during render, before children, so renderItem sees up-to-date sets.
  useMemo(() => {
    const newOnes = new Set<string>();
    for (const m of messages) {
      if (!seenKeysRef.current.has(m._key)) {
        seenKeysRef.current.add(m._key);
        newOnes.add(m._key);
      }
    }
    newlyAddedKeysRef.current = newOnes;
  }, [messages]);

  // After messages update from a pagination, re-enable cooldown and decide hasMore
  useEffect(() => {
    paginationCooldownRef.current = false;
    if (messages.length > 0 && messages.length < pageSize) {
      setHasMore(false);
    }
  }, [messages.length, pageSize]);


  const openEmoji = useCallback(() => {
    if (emojiAnimating.current) return;
    emojiAnimating.current = true;
    emojiOpenRef.current = true;
    Keyboard.dismiss();
    setEmojiOpen(true);
    // Animate emoji panel up + give content room via bottomPad (keyboard is dismissed, so KAV won't add padding)
    bottomPad.value = withTiming(EMOJI_PANEL_HEIGHT, { duration: 280, easing: REasing.out(REasing.cubic) });
    Animated.timing(emojiTranslate, {
      toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start(() => { emojiAnimating.current = false; });
  }, [emojiTranslate, bottomPad]);

  const closeEmoji = useCallback(() => {
    if (emojiAnimating.current) return;
    emojiAnimating.current = true;
    emojiOpenRef.current = false;
    bottomPad.value = withTiming(0, { duration: 240, easing: REasing.in(REasing.cubic) });
    Animated.timing(emojiTranslate, {
      toValue: EMOJI_PANEL_HEIGHT, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: true,
    }).start(() => { emojiAnimating.current = false; setEmojiOpen(false); });
  }, [emojiTranslate, bottomPad]);

  // KeyboardAvoidingView from react-native-keyboard-controller handles keyboard padding natively.
  // bottomPad is now used ONLY for emoji panel (when keyboard is closed).
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const showSub = Keyboard.addListener(showEvt, () => {
      if (emojiOpenRef.current) closeEmoji();
    });
    return () => { showSub.remove(); };
  }, [closeEmoji]);

  const handlePinPress = useCallback(() => {
    if (!pins.length) return;
    const idx = pinIndexRef.current % pins.length;
    pinIndexRef.current = idx + 1;
    const y = msgPositionsRef.current.get(pins[idx].key);
    if (y !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: Math.max(0, y - headerH - pinH - 20), animated: true });
    }
  }, [pins, headerH, pinH]);

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
      const info = await FileSystem.getInfoAsync(uri);
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
    if (pendingAnimSticker) {
      const aid = pendingAnimSticker;
      setPendingAnimSticker(null);
      setPendingSticker(null);
      await sendAnimSticker(chatId, user, aid);
      return;
    }
    const t = text.trim();
    if (pendingSticker && t === pendingSticker) {
      setPendingSticker(null);
      setText('');
      await sendSticker(chatId, user, t);
      return;
    }
    if (!t) return;
    setText('');
    stopTyping(chatId, user);
    const reply = replyTo;
    setReplyTo(null);
    await sendMessage(chatId, user, t, reply ?? undefined);
  }, [text, chatId, user, replyTo, pendingSticker, pendingAnimSticker]);

  // — Pick image —
  const handlePickImage = useCallback(async () => {
    setPendingSticker(null);
    setPendingAnimSticker(null);
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
    setPendingSticker(null);
    setPendingAnimSticker(null);
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
    setToastMsg('Скопировано');
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

  const handleDelete = useCallback(() => {
    if (!selectedMsg) return;
    const key = selectedMsg._key;
    console.log('[Delete] handleDelete key=', key, 'selectedMsg=', !!selectedMsg, 'pickerVisible=', pickerVisible);
    setThanosTargetKey(key);
    setDeletingKeys(prev => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, [selectedMsg, pickerVisible]);

  const actuallyDelete = useCallback(async (key: string) => {
    console.log('[Delete] actuallyDelete (anim done) key=', key);
    scrollLockUntilRef.current = Date.now() + SCROLL_LOCK_AFTER_DELETE_MS;
    try {
      await deleteMessage(chatId, key);
      console.log('[Delete] firebase remove done key=', key);
    } finally {
      setDeletingKeys(prev => {
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setThanosTargetKey(prev => (prev === key ? null : prev));
    }
  }, [chatId]);

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
    setPendingSticker(null);
    setPendingAnimSticker(null);
    await editMessage(chatId, msg._key, t);
  }, [editMsg, text, chatId]);

  const handleEditCancel = useCallback(() => {
    setText(prevTextRef.current);
    prevTextRef.current = '';
    setEditMsg(null);
    setPendingSticker(null);
    setPendingAnimSticker(null);
  }, []);

  const handleForwardPick = useCallback(async (target: ForwardTarget) => {
    if (!forwardMsg) return;
    const msg = forwardMsg;
    setForwardMsg(null);
    await forwardMessage(target.id, user, msg);
    if (target.id !== chatId && onNavigateToChat) {
      onNavigateToChat(target.id, target.name, target.isGroup);
    }
  }, [forwardMsg, user, chatId, onNavigateToChat]);

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
    if (pendingAnimSticker) setPendingAnimSticker(null);
    if (pendingSticker && t !== pendingSticker) setPendingSticker(null);
    if (t.length > 0) setTyping(chatId, user);
    else stopTyping(chatId, user);
  }, [chatId, user, pendingSticker, pendingAnimSticker]);

  // showSender вычисляем отдельно, не встраивая в объекты сообщений
  const showSenderMap = useMemo(() => {
    const map = new Map<string, boolean>();
    messages.forEach((item, index) => {
      map.set(item._key, (isGroup || isGeneralChat) && (index === 0 || messages[index - 1].sender !== item.sender));
    });
    return map;
  }, [messages, isGroup, isGeneralChat]);

  const handleImagePress = useCallback((url: string) => {
    if (!onOpenGallery) return;
    const images: string[] = [];
    for (const m of messages) if (m.image) images.push(m.image);
    const idx = images.indexOf(url);
    if (idx >= 0) onOpenGallery(images, idx);
  }, [messages, onOpenGallery]);

  const renderItem = useCallback(({ item }: { item: Message; index: number }) => {
    const isFreshlyArrived = newlyAddedKeysRef.current.has(item._key)
      && typeof item.ts === 'number' && (Date.now() - item.ts) < 5000;
    const bubble = (
      <MessageBubble
        message={item}
        isMe={item.sender === user}
        isRead={item.sender === user && typeof item.ts === 'number' && item.ts > 0 && item.ts <= maxOtherReadTs}
        showSender={showSenderMap.get(item._key) ?? false}
        onLongPress={handleLongPress}
        onReactionPress={handleReactionPress}
        onReply={handleReply}
        onImagePress={handleImagePress}
        bubbleColor={chatTheme?.acc}
        peer={!isGroup && !isGeneralChat ? chatName : undefined}
        registerBubbleRef={registerBubbleRef}
      />
    );
    if (isFreshlyArrived) {
      return <Reanimated.View entering={ENTER_ANIM}>{bubble}</Reanimated.View>;
    }
    return bubble;
  }, [user, showSenderMap, handleLongPress, handleReactionPress, handleReply, handleImagePress, chatTheme, maxOtherReadTs, isGroup, isGeneralChat, chatName, registerBubbleRef]);

  const keyExtractor = useCallback((item: Message) => item._key, []);

  const handleListScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    isNearBottomRef.current = distFromBottom < 80;
    // Pagination: chronological list, near top = oldest. Trigger to load older.
    if (contentOffset.y < 200 && hasMore && !paginationCooldownRef.current && messages.length >= pageSize) {
      paginationCooldownRef.current = true;
      console.log('[Pagination] BUMP pageSize from', pageSize, 'to', pageSize + 50);
      setPageSize(prev => prev + 50);
    }
  }, [hasMore, messages.length, pageSize]);

  const handleContentSizeChange = useCallback((_w: number, h: number) => {
    if (!scrollViewRef.current) return;
    const prev = prevContentHeightRef.current;
    const delta = h - prev;
    prevContentHeightRef.current = h;
    const lastMsg = messages[messages.length - 1];
    const lastTs = typeof lastMsg?.ts === 'number' ? lastMsg.ts : 0;
    const prevLastTs = lastBottomTsRef.current;
    const isNewBottomMsg = lastTs > prevLastTs;
    lastBottomTsRef.current = lastTs;

    const now = Date.now();
    const lockTs = scrollLockUntilRef.current;
    const locked = now < lockTs;
    console.log('[List] h=', Math.round(h), 'Δ=', Math.round(delta), 'msgs=', messages.length, 'pageSize=', pageSize, 'newBottom=', isNewBottomMsg, 'locked=', locked, 'lockMs=', lockTs ? (lockTs - now) : 0);

    if (!initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true;
      scrollViewRef.current?.scrollToEnd({ animated: false });
      Animated.timing(listOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      return;
    }
    if (locked) return;
    // Auto-scroll only when a new message actually arrived AT THE BOTTOM (lastTs increased).
    // Older messages pulled into the window from above, deletes, edits — do NOT trigger auto-scroll.
    if (isNewBottomMsg && isNearBottomRef.current) {
      console.log('[List] scrollToEnd (newBottom, nearBottom)');
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [listOpacity, messages, pageSize]);


  const avatarBg = isGeneralChat ? theme.accent : isGroup ? '#00B894' : getAvatarColor(chatName);
  const avatarChar = isGeneralChat ? '💬' : isGroup ? '👥' : chatName.charAt(0).toUpperCase();
  const hasText = text.trim().length > 0;
  const accentColor = chatTheme?.acc ?? theme.accent;

  // Timer display
  const d = displayTime;
  const timerLabel = `${Math.floor(d / 600)}:${String(Math.floor(d / 10) % 60).padStart(2, '0')},${d % 10}`;

  return (
    <GestureHandlerRootView style={[styles.container, chatTheme && { backgroundColor: '#0a0a1a' }]}>
      <KeyboardAvoidingView behavior="padding" style={styles.content}>
        <Reanimated.View style={[styles.content, contentAnimStyle]}>
        {/* Header */}
        <View
          style={[styles.header, styles.headerAbs, { backgroundColor: theme.bg2 }]}
          onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
        >
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
        </View>

        {/* Pin bar */}
        {pins && pins.length > 0 && (
          <View
            style={[styles.pinBarWrap, styles.pinBarAbs, { top: headerH, backgroundColor: theme.bg2 }]}
            onLayout={(e) => setPinH(e.nativeEvent.layout.height)}
          >
            <PinBar pins={pins} onPress={handlePinPress} />
          </View>
        )}

        {/* Messages + reply bar (absolute поверх списка) */}
        <Animated.View style={[styles.listWrap, { opacity: listOpacity }]}>
          <ScrollView
            ref={scrollViewRef}
            onScroll={handleListScroll}
            scrollEventThrottle={16}
            onContentSizeChange={handleContentSizeChange}
            style={styles.list}
            contentContainerStyle={{
              paddingTop: 12 + headerH + pinH,
              paddingBottom: 12 + inputH + (editMsg ? editH : 0) + (replyTo ? replyH : 0),
              minHeight: 1, // ensure contentContainer is always measurable
            }}
          >
            {messages.length === 0 ? <ChatEmpty /> : messages.map((item, index) => {
              const isFreshlyArrived = newlyAddedKeysRef.current.has(item._key)
                && typeof item.ts === 'number' && (Date.now() - item.ts) < 5000;
              const onLayout = (e: any) => {
                msgPositionsRef.current.set(item._key, e.nativeEvent.layout.y);
              };
              const bubble = (
                <MessageBubble
                  message={item}
                  isMe={item.sender === user}
                  isRead={item.sender === user && typeof item.ts === 'number' && item.ts > 0 && item.ts <= maxOtherReadTs}
                  showSender={showSenderMap.get(item._key) ?? false}
                  onLongPress={handleLongPress}
                  onReactionPress={handleReactionPress}
                  onReply={handleReply}
                  onImagePress={handleImagePress}
                  bubbleColor={chatTheme?.acc}
                  peer={!isGroup && !isGeneralChat ? chatName : undefined}
                  registerBubbleRef={registerBubbleRef}
                />
              );
              return (
                <View key={item._key} onLayout={onLayout}>
                  {isFreshlyArrived ? <Reanimated.View entering={ENTER_ANIM}>{bubble}</Reanimated.View> : bubble}
                  {index < messages.length - 1 && <MessageSeparator />}
                </View>
              );
            })}
          </ScrollView>
        </Animated.View>

        {editMsg && (
          <View
            style={[styles.editBar, styles.barAbs, { bottom: inputH, backgroundColor: theme.bg2 }]}
            onLayout={(e) => setEditH(e.nativeEvent.layout.height)}
          >
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

        {pendingAnimSticker && (
          <View
            style={[styles.animBar, styles.barAbs, { bottom: inputH + (editMsg ? editH : 0) + (replyTo ? replyH : 0), backgroundColor: theme.bg2 }]}
          >
            <View style={styles.animBarIcon}>
              <Text style={{ fontSize: 18 }}>✨</Text>
            </View>
            <View style={styles.animBarContent}>
              <Text style={styles.animBarLabel}>Живой стикер</Text>
              <Text style={styles.animBarName} numberOfLines={1}>
                {ANIM_STICKERS.find(s => s.id === pendingAnimSticker)?.name || ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setPendingAnimSticker(null)} style={styles.animBarClose}>
              <IconClose size={16} color={theme.text2} />
            </TouchableOpacity>
          </View>
        )}

        {replyTo && (
          <View
            style={[styles.replyBar, styles.barAbs, { bottom: inputH + (editMsg ? editH : 0) + (pendingAnimSticker ? 48 : 0), backgroundColor: theme.bg2 }]}
            onLayout={(e) => setReplyH(e.nativeEvent.layout.height)}
          >
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
        <View
          style={[styles.inb, { paddingBottom: inbBottomPad }]}
          onLayout={(e) => setInputH(e.nativeEvent.layout.height)}
        >
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

        <ThemePicker
          visible={themePickerOpen}
          current={chatTheme}
          onSelect={handleThemeSelect}
          onClose={() => setThemePickerOpen(false)}
        />

        <ChatMenu
          visible={chatMenuOpen}
          canVideoCall={!isGeneralChat && !isGroup}
          topOffset={headerH + 4}
          onPick={handleChatMenuPick}
          onClose={() => setChatMenuOpen(false)}
        />

        <Toast
          message={toastMsg || ''}
          visible={!!toastMsg}
          onHide={() => setToastMsg(null)}
        />


        {/* Video recording overlay */}
        {videoRecording && (
          <VideoRecorder
            onSend={handleSendVideo}
            onCancel={() => setVideoRecording(false)}
          />
        )}
        </Reanimated.View>
      </KeyboardAvoidingView>

      {/* Singleton ThanosSnap: ONE instance for the whole chat. Captures + animates over the
          long-pressed / deleting bubble using its registered ref + measureInWindow position. */}
      {(() => {
        const targetKey = thanosTargetKey ?? selectedMsg?._key ?? null;
        const bubbleRef = targetKey ? bubbleRefsMap.current.get(targetKey) : null;
        return (
          <ThanosSnap
            bubbleRef={bubbleRef}
            armed={!!selectedMsg && !!bubbleRef}
            active={!!thanosTargetKey && !!bubbleRef && deletingKeys.has(thanosTargetKey)}
            onComplete={() => { if (thanosTargetKey) actuallyDelete(thanosTargetKey); }}
          />
        );
      })()}

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
          onSticker={(s) => { setPendingSticker(s); setText(s); closeEmoji(); }}
          onAnimSticker={(id) => { setPendingAnimSticker(id); closeEmoji(); }}
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
  headerAbs: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  pinBarAbs: { position: 'absolute', left: 0, right: 0, zIndex: 9 },
  barAbs: { position: 'absolute', left: 0, right: 0, zIndex: 9 },
  menuDots: { fontSize: 22, color: theme.text, lineHeight: 26 },
  pinBarWrap: { overflow: 'hidden' },
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
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: theme.text3, fontSize: 15 },

  editBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: theme.border,
    gap: 8,
    overflow: 'hidden',
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
    overflow: 'hidden',
  },
  replyBarIcon: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  replyBarContent: { flex: 1, minWidth: 0 },
  replyBarAuthor: { fontSize: 13, color: theme.accent, fontWeight: '700', marginBottom: 1 },
  replyBarText: { fontSize: 13, color: theme.text2 },
  replyBarClose: { padding: 4, flexShrink: 0 },

  /* animBar — pending animated sticker */
  animBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: theme.border,
    gap: 8,
    overflow: 'hidden',
  },
  animBarIcon: { flexShrink: 0, alignItems: 'center', justifyContent: 'center', width: 28, height: 28 },
  animBarContent: { flex: 1, minWidth: 0 },
  animBarLabel: { fontSize: 13, color: theme.accent, fontWeight: '700', marginBottom: 1 },
  animBarName: { fontSize: 13, color: theme.text2 },
  animBarClose: { padding: 4, flexShrink: 0 },

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
