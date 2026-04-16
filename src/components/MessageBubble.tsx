import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../styles/theme';
import type { Message } from '../managers/ChatManager';

type Props = {
  message: Message;
  isMe: boolean;
  showSender: boolean;
  onLongPress: (msg: Message) => void;
  onReactionPress: (msgKey: string, emoji: string) => void;
};

const SENDER_COLORS = ['#E85D75','#6C5CE7','#00B894','#FDCB6E','#E17055','#0984E3','#A29BFE','#55EFC4'];
function senderColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % SENDER_COLORS.length;
  return SENDER_COLORS[h];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}

export default function MessageBubble({ message: m, isMe, showSender, onLongPress, onReactionPress }: Props) {
  const reactionMap: Record<string, number> = {};
  if (m.reactions) {
    Object.values(m.reactions).forEach((r) => {
      if (r?.emoji) reactionMap[r.emoji] = (reactionMap[r.emoji] || 0) + 1;
    });
  }
  const reactionEntries = Object.entries(reactionMap);

  return (
    <View style={[styles.row, isMe ? styles.rowMe : styles.rowOther]}>
      <TouchableOpacity activeOpacity={0.85} delayLongPress={400} onLongPress={() => onLongPress(m)}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          {showSender && !isMe && (
            <Text style={[styles.senderName, { color: senderColor(m.sender) }]}>{m.sender}</Text>
          )}
          {m.replyTo && (
            <View style={styles.replyQuote}>
              <View style={styles.replyLine} />
              <View style={{ flex: 1 }}>
                <Text style={styles.replyAuthor}>{m.replyTo.sender}</Text>
                <Text style={styles.replyText} numberOfLines={1}>{m.replyTo.text || 'медиа'}</Text>
              </View>
            </View>
          )}
          {m.text ? <Text style={[styles.text, isMe ? styles.textMe : styles.textOther]}>{m.text}</Text> : null}
          <View style={styles.meta}>
            {m.edited && <Text style={styles.edited}>изменено </Text>}
            <Text style={styles.time}>{formatTime(m.ts)}</Text>
            {isMe && <Text style={styles.check}>✓</Text>}
          </View>
        </View>
        {reactionEntries.length > 0 && (
          <View style={[styles.reactions, isMe ? styles.reactionsMe : styles.reactionsOther]}>
            {reactionEntries.map(([emoji, count]) => (
              <TouchableOpacity key={emoji} style={styles.reactionBadge} onPress={() => onReactionPress(m._key, emoji)}>
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                <Text style={styles.reactionCount}>{count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, paddingVertical: 2, maxWidth: '85%' },
  rowMe: { alignSelf: 'flex-end' },
  rowOther: { alignSelf: 'flex-start' },
  bubble: { borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, minWidth: 60 },
  bubbleMe: { backgroundColor: theme.accent, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: theme.bg2, borderBottomLeftRadius: 4 },
  senderName: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  replyQuote: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: 6, marginBottom: 6, gap: 6 },
  replyLine: { width: 3, borderRadius: 2, backgroundColor: '#fff' },
  replyAuthor: { fontSize: 11, fontWeight: '700', color: '#fff', opacity: 0.9 },
  replyText: { fontSize: 12, color: '#fff', opacity: 0.7 },
  text: { fontSize: 15, lineHeight: 20 },
  textMe: { color: '#fff' },
  textOther: { color: theme.text },
  meta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 3, gap: 3 },
  edited: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  time: { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  check: { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  reactionsMe: { justifyContent: 'flex-end' },
  reactionsOther: { justifyContent: 'flex-start' },
  reactionBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bg3, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, gap: 3 },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 11, color: theme.text2 },
});
