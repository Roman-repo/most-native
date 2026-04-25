import { useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { IconVideoCamera, IconWallpaper } from './Icons';

export type ChatMenuAction = 'videoCall' | 'wallpaper';

type Props = {
  visible: boolean;
  canVideoCall: boolean;
  onPick: (action: ChatMenuAction) => void;
  onClose: () => void;
};

export default function ChatMenu({ visible, canVideoCall, onPick, onClose }: Props) {
  const ref = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['25%'], []);

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
      snapPoints={snapPoints}
      enableDynamicSizing
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.bg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.content}>
        {canVideoCall && (
          <TouchableOpacity
            style={styles.item}
            activeOpacity={0.6}
            onPress={() => onPick('videoCall')}
          >
            <IconVideoCamera size={20} color="#fff" />
            <Text style={styles.itemText}>Видеозвонок</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.item}
          activeOpacity={0.6}
          onPress={() => onPick('wallpaper')}
        >
          <IconWallpaper size={20} color="#fff" />
          <Text style={styles.itemText}>Изменить обои</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  bg: { backgroundColor: 'rgba(28, 28, 40, 0.98)' },
  handle: { backgroundColor: 'rgba(255,255,255,0.3)' },
  content: { paddingBottom: 24 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  itemText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
});
