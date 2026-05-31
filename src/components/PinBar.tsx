import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';
import type { PinInfo } from '../managers/ChatManager';

/* ---------- SVG list icon ---------- */
function IconList({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', gap: 2.5 }}>
      <View style={{ height: 2, borderRadius: 1, backgroundColor: color }} />
      <View style={{ height: 2, borderRadius: 1, backgroundColor: color }} />
      <View style={{ height: 2, borderRadius: 1, backgroundColor: color }} />
    </View>
  );
}

/* ---------- segment indicator ---------- */
function PinIndicator({ count, index }: { count: number; index: number }) {
  if (count <= 1) {
    return <View style={styles.indicatorSingle} />;
  }
  const segH = Math.max(6, 100 / count);
  const top = (index / count) * 100;
  return (
    <View style={styles.indicatorTrack}>
      <View style={[styles.indicatorSeg, { height: `${segH}%`, top: `${top}%` }]} />
    </View>
  );
}

/* ---------- main ---------- */
type Props = {
  pins: PinInfo[];
  currentIndex: number;
  onPress: () => void;
  onOpenList?: () => void;
};

export default function PinBar({ pins, currentIndex, onPress, onOpenList }: Props) {
  if (!pins.length) return null;
  const idx = Math.max(0, Math.min(currentIndex, pins.length - 1));
  const current = pins[idx];
  const title = pins.length > 1
    ? `Закреплённое сообщение #${pins.length - idx}`
    : 'Закреплённое сообщение';

  const preview = current.text
    ? current.text.length > 60 ? current.text.slice(0, 60) + '…' : current.text
    : '📷 Медиа';

  return (
    <View style={styles.bar}>
      <PinIndicator count={pins.length} index={idx} />

      <TouchableOpacity style={styles.body} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.preview} numberOfLines={1}>{preview}</Text>
        </View>
      </TouchableOpacity>

      {onOpenList && (
        <TouchableOpacity style={styles.listBtn} onPress={onOpenList} activeOpacity={0.6}>
          <IconList size={18} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.bg2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(102,126,234,0.1)',
    gap: 10,
  },
  /* vertical segment indicator */
  indicatorSingle: {
    width: 3,
    height: 28,
    borderRadius: 2,
    backgroundColor: theme.accent,
    flexShrink: 0,
  },
  indicatorTrack: {
    width: 3,
    height: 28,
    borderRadius: 2,
    backgroundColor: theme.border,
    flexShrink: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  indicatorSeg: {
    position: 'absolute',
    left: 0,
    width: '100%',
    backgroundColor: theme.accent,
    borderRadius: 2,
  },
  /* body */
  body: {
    flex: 1,
    minWidth: 0,
  },
  content: {
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.accent,
  },
  preview: {
    fontSize: 13,
    color: theme.text2,
    marginTop: 1,
  },
  listBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
