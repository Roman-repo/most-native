import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { theme } from '../styles/theme';
import MessageBubble from '../components/MessageBubble';
import ReactionPicker from '../components/ReactionPicker';
import PinBar from '../components/PinBar';
import {
  listenMessages, sendMessage, toggleReaction, listenPins, togglePin,
  type Message, type PinInfo,
} from '../managers/ChatManager';

type Props = {
  chatId: string;
  chatName: string;
  user: string;
  isGroup: boolean;
  onBack: () => void;
};

type ReplyInfo = { sender: string; text: string };

export default function ChatScreen({ chatId, chatName, user, isGroup, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pins, setPins] = useState<PinInfo[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ReplyInfo | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const unsubMsgs = listenMessages(chatId, setMessages);
    const unsubPins = listenPins(chatId, setPins);
    return () => { unsubMsgs(); unsubPins(); };
  }, [chatId]);

  // Прокрутка вниз при новых сообщениях
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    const reply = replyTo;
    setReplyTo(null);
    await sendMessage(chatId, user, t, reply ?? undefined);
  }, [text, chatId, user, replyTo]);

  const handleLongPress = useCallback((msg: Message) => {
    setSelectedMsg(msg);
    setPickerVisible(true);
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Хедер */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{chatName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Пин-бар */}
      <PinBar pins={pins} onPress={() => {}} />

      {/* Список сообщений */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._key}
        renderItem={({ item, index }) => {
          const prevMsg = index > 0 ? messages[index - 1] : null;
          const showSender = isGroup && (!prevMsg || prevMsg.sender !== item.sender);
          return (
            <MessageBubble
              message={item}
              isMe={item.sender === user}
              showSender={showSender}
              onLongPress={handleLongPress}
              onReactionPress={handleReactionPress}
            />
          );
        }}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Начните общение 👋</Text>
          </View>
        }
      />

      {/* Панель ответа */}
      {replyTo && (
        <View style={styles.replyBar}>
          <View style={styles.replyBarLine} />
          <View style={styles.replyBarContent}>
            <Text style={styles.replyBarAuthor}>{replyTo.sender}</Text>
            <Text style={styles.replyBarText} numberOfLines={1}>{replyTo.text || '📷'}</Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyClose}>
            <Text style={styles.replyCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Поле ввода */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Сообщение..."
          placeholderTextColor={theme.text3}
          value={text}
          onChangeText={setText}
          multiline
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, text.trim() ? styles.sendBtnActive : null]}
          onPress={handleSend}
          disabled={!text.trim()}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>

      {/* Панель реакций */}
      <ReactionPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onReact={handleReact}
        onReply={() => selectedMsg && handleReply(selectedMsg)}
        onPin={handlePin}
        isMe={selectedMsg?.sender === user}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.bg2,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backBtn: { width: 40 },
  backIcon: { fontSize: 22, color: theme.accent },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: theme.text },
  messageList: { flex: 1 },
  messageListContent: { paddingVertical: 8 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: theme.text3, fontSize: 15 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bg2,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    gap: 8,
  },
  replyBarLine: { width: 3, height: 36, backgroundColor: theme.accent, borderRadius: 2 },
  replyBarContent: { flex: 1 },
  replyBarAuthor: { fontSize: 12, color: theme.accent, fontWeight: '700', marginBottom: 1 },
  replyBarText: { fontSize: 13, color: theme.text2 },
  replyClose: { padding: 6 },
  replyCloseText: { color: theme.text3, fontSize: 16 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: theme.bg2,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    gap: 8,
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
    maxHeight: 120,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: { backgroundColor: theme.accent },
  sendIcon: { color: '#fff', fontSize: 16 },
});
