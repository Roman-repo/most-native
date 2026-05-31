import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconPhone, IconVideoCamera, IconCallOut, IconCallIn } from './Icons';
import { startCall } from '../services/CallManager';
import type { Message } from '../managers/ChatManager';

type Props = {
  message: Message;
  peer: string;
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}

function buildTitle(m: Message): string {
  const isVideo = !!m.callVideo;
  const kind = isVideo ? 'видеовызов' : 'звонок';
  if (m.missed) return isVideo ? 'Пропущенный видеовызов' : 'Пропущенный вызов';
  if (m.callDir === 'out') return 'Исходящий ' + kind;
  return 'Входящий ' + kind;
}

export default function CallBubble({ message, peer }: Props) {
  const isVideo = !!message.callVideo;
  const missed = !!message.missed;
  const outgoing = message.callDir === 'out';
  const title = buildTitle(message);
  const dur = message.callDur;
  const timeStr = formatTime(message.ts as number);

  const arrowColor = missed ? '#e74c3c' : '#00b894';

  return (
    <TouchableOpacity
      onPress={() => startCall(peer, isVideo).catch(() => {})}
      activeOpacity={0.75}
      style={styles.wrap}
    >
      <View style={styles.bubble}>
        <View style={styles.info}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.meta}>
            {outgoing
              ? <IconCallOut size={12} color={arrowColor} />
              : <IconCallIn size={12} color={arrowColor} />}
            <Text style={styles.metaText}>
              {dur ? dur + ' · ' : ''}{timeStr}
            </Text>
          </View>
        </View>
        <View style={styles.iconWrap}>
          {isVideo
            ? <IconVideoCamera size={22} color="#fff" />
            : <IconPhone size={22} color="#fff" />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-end',
    marginVertical: 3,
    paddingHorizontal: 16,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#667eea',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
    minWidth: 180,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    opacity: 0.7,
  },
  metaText: {
    fontSize: 12,
    color: '#fff',
  },
  iconWrap: {
    flexShrink: 0,
  },
});
