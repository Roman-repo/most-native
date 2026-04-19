import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Animated, Easing, Platform, Keyboard,
} from 'react-native';
import { theme } from '../styles/theme';

type Props = {
  visible: boolean;
  initialText: string;
  onConfirm: (newText: string) => void;
  onCancel: () => void;
};

export default function EditPanel({ visible, initialText, onConfirm, onCancel }: Props) {
  const translateY = useRef(new Animated.Value(100)).current;
  const [text, setText] = useState(initialText);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setText(initialText);
      Animated.timing(translateY, {
        toValue: 0, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }).start(() => inputRef.current?.focus());
    } else {
      Animated.timing(translateY, {
        toValue: 100, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true,
      }).start();
    }
  }, [visible, initialText]);

  if (!visible) return null;

  const percentY = translateY.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  const handleConfirm = () => {
    const t = text.trim();
    if (t) onConfirm(t);
    Keyboard.dismiss();
  };

  return (
    <Animated.View style={[styles.panel, { transform: [{ translateY: percentY }] }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Редактирование</Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
          <Text style={styles.closeTxt}>✕</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          multiline
          style={styles.input}
          placeholder="Текст сообщения"
          placeholderTextColor={theme.text3}
        />
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.accent }]} onPress={handleConfirm}>
          <Text style={styles.saveTxt}>✓</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,12,41,0.98)',
    borderTopWidth: 1, borderTopColor: theme.border,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    zIndex: 15,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4,
  },
  title: { color: theme.accent, fontSize: 14, fontWeight: '600' },
  closeBtn: { padding: 4 },
  closeTxt: { color: theme.text3, fontSize: 18 },
  body: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 6, gap: 8,
  },
  input: {
    flex: 1, color: theme.text, fontSize: 16, lineHeight: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10,
    maxHeight: 120,
    borderWidth: 1, borderColor: 'rgba(102,126,234,0.2)',
  },
  saveBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  saveTxt: { color: '#fff', fontSize: 20, fontWeight: '600' },
});
