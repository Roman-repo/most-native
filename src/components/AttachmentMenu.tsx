import { useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { theme } from '../styles/theme';
import { IconGallery, IconCamera, IconFile, IconContact } from './Icons';

export type AttachmentAction = 'gallery' | 'camera' | 'file' | 'contact';

type Props = {
  visible: boolean;
  onPick: (action: AttachmentAction) => void;
  onClose: () => void;
};

const ITEMS: { action: AttachmentAction; icon: typeof IconGallery; label: string }[] = [
  { action: 'gallery', icon: IconGallery, label: 'Галерея' },
  { action: 'camera', icon: IconCamera, label: 'Камера' },
  { action: 'file', icon: IconFile, label: 'Файл' },
  { action: 'contact', icon: IconContact, label: 'Контакт' },
];

export default function AttachmentMenu({ visible, onPick, onClose }: Props) {
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

  const handle = (action: AttachmentAction) => () => {
    onPick(action);
  };

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
          <Text style={styles.title}>Вложение</Text>
        </View>
        <View style={styles.grid}>
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity key={item.action} style={styles.item} activeOpacity={0.6} onPress={handle(item.action)}>
                <View style={styles.iconWrap}>
                  <Icon size={28} color={theme.text} />
                </View>
                <Text style={styles.label}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  bg: { backgroundColor: 'rgba(15,12,41,0.97)' },
  handle: { backgroundColor: 'rgba(255,255,255,0.3)' },
  panel: { paddingBottom: 32 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '600', color: theme.text },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  item: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    minWidth: 64,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 12, color: theme.text2 },
});
