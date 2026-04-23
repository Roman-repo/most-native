import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconPhone } from './Icons';
import { startCall } from '../services/CallManager';
import type { Message } from '../managers/ChatManager';

type Props = {
  message: Message;
  peer: string;
};

function buildText(m: Message): { text: string; red: boolean } {
  if (m.missed) return { text: 'Пропущенный вызов', red: true };
  if (m.callDur) {
    const dir = m.callDir === 'out' ? 'Исходящий' : 'Входящий';
    return { text: `${dir} звонок · ${m.callDur}`, red: false };
  }
  // Без длительности: используем message.text если он есть
  if (m.text) {
    const red = m.text.includes('Отклонённый') || m.text.includes('Нет ответа') ||
                m.text.includes('Занят') || m.text.includes('Отменённый');
    return { text: m.text, red };
  }
  return { text: 'Звонок', red: false };
}

export default function CallBubble({ message, peer }: Props) {
  const { text, red } = buildText(message);
  return (
    <TouchableOpacity
      onPress={() => startCall(peer).catch(() => {})}
      activeOpacity={0.75}
      style={styles.wrap}
    >
      <View style={[styles.bubble, red && styles.bubbleRed]}>
        <View style={[styles.iconCircle, red && styles.iconCircleRed]}>
          <IconPhone size={16} color={red ? '#E85D75' : '#4892f7'} />
        </View>
        <Text style={[styles.text, red && styles.textRed]} numberOfLines={1}>{text}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(72, 146, 247, 0.15)',
    borderRadius: 16,
    paddingLeft: 8,
    paddingRight: 14,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(72, 146, 247, 0.35)',
  },
  bubbleRed: {
    backgroundColor: 'rgba(232, 93, 117, 0.15)',
    borderColor: 'rgba(232, 93, 117, 0.35)',
  },
  iconCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(72, 146, 247, 0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconCircleRed: { backgroundColor: 'rgba(232, 93, 117, 0.25)' },
  text: { color: '#fff', fontSize: 13, fontWeight: '500' },
  textRed: { color: 'rgba(255,255,255,0.9)' },
});
