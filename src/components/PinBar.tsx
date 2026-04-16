import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';
import type { PinInfo } from '../managers/ChatManager';

type Props = {
  pins: PinInfo[];
  onPress: () => void;
};

export default function PinBar({ pins, onPress }: Props) {
  if (!pins.length) return null;
  const current = pins[pins.length - 1];
  return (
    <TouchableOpacity style={styles.bar} onPress={onPress}>
      <Text style={styles.icon}>📌</Text>
      <View style={styles.content}>
        <Text style={styles.label}>
          Закреплённое{pins.length > 1 ? ` (${pins.length})` : ''}
        </Text>
        <Text style={styles.text} numberOfLines={1}>{current.text}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.bg2,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 10,
  },
  icon: { fontSize: 16 },
  content: { flex: 1 },
  label: { fontSize: 11, color: theme.accent, fontWeight: '600', marginBottom: 1 },
  text: { fontSize: 13, color: theme.text2 },
});
