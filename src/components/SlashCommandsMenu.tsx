import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';

export type SlashCmd = { cmd: string; desc: string };

const COMMANDS: SlashCmd[] = [
  { cmd: '/слова', desc: 'Список триггерных слов' },
  { cmd: '/эффект', desc: 'Запустить эффект' },
];

type Props = {
  filter: string;
  onPick: (cmd: string) => void;
};

export default function SlashCommandsMenu({ filter, onPick }: Props) {
  const items = useMemo(() => {
    const f = filter.toLowerCase().replace(/^\//, '');
    return COMMANDS.filter((c) => c.cmd.toLowerCase().includes(f));
  }, [filter]);

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      {items.map((item) => (
        <TouchableOpacity key={item.cmd} style={styles.row} activeOpacity={0.6} onPress={() => onPick(item.cmd)}>
          <Text style={styles.cmd}>{item.cmd}</Text>
          <Text style={styles.desc}>{item.desc}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.bg2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
    maxHeight: 200,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  cmd: { color: theme.accent, fontWeight: '600', fontSize: 15 },
  desc: { color: theme.text2, fontSize: 13, marginLeft: 8 },
});
