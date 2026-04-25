import { useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { theme } from '../styles/theme';
import { CHAT_THEMES, type ChatTheme } from '../utils/chatThemes';

type Props = {
  visible: boolean;
  current: ChatTheme | null;
  onSelect: (t: ChatTheme | null) => void;
  onClose: () => void;
};

export default function ThemePicker({ visible, current, onSelect, onClose }: Props) {
  const ref = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) ref.current?.present();
    else ref.current?.dismiss();
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} pressBehavior="close" />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.bg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.title}>Тема чата</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
          <TouchableOpacity
            style={[styles.card, !current && styles.cardActive]}
            onPress={() => onSelect(null)}
          >
            <View style={[styles.preview, { backgroundColor: '#667eea' }]} />
            <Text style={styles.cardLabel}>По умолчанию</Text>
          </TouchableOpacity>
          {CHAT_THEMES.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.card, current?.id === t.id && styles.cardActive]}
              onPress={() => onSelect(t)}
            >
              <View style={[styles.preview, { backgroundColor: t.acc }]} />
              <Text style={styles.cardEmoji}>{t.emoji}</Text>
              <Text style={styles.cardLabel}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  bg: { backgroundColor: 'rgba(15,12,41,0.97)' },
  handle: { backgroundColor: 'rgba(255,255,255,0.3)' },
  panel: { paddingBottom: 24 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  title: { fontSize: 16, fontWeight: '600', color: theme.text },
  list: { paddingHorizontal: 12, gap: 10, alignItems: 'center' },
  card: {
    alignItems: 'center',
    gap: 4,
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 72,
  },
  cardActive: { borderColor: theme.accent },
  preview: { width: 52, height: 52, borderRadius: 26 },
  cardEmoji: { fontSize: 20, marginTop: -20 },
  cardLabel: { fontSize: 11, color: theme.text2, textAlign: 'center' },
});
