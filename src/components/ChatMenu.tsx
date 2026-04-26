import { useLayoutEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Easing,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { IconVideoCamera, IconWallpaper } from './Icons';
import { theme } from '../styles/theme';

export type ChatMenuAction = 'videoCall' | 'wallpaper';

type Props = {
  visible: boolean;
  canVideoCall: boolean;
  topOffset: number;
  onPick: (action: ChatMenuAction) => void;
  onClose: () => void;
};

const MENU_WIDTH = 220;

export default function ChatMenu({ visible, canVideoCall, topOffset, onPick, onClose }: Props) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const translateY = useRef(new Animated.Value(-8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useLayoutEffect(() => {
    if (visible) {
      scale.setValue(0.92); translateY.setValue(-8); opacity.setValue(0);
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const close = () => {
    Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true }).start(onClose);
  };

  const handle = (action: ChatMenuAction) => () => {
    onPick(action);
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={close} />
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.anchor,
          { top: topOffset, opacity, transform: [{ scale }, { translateY }] },
        ]}
      >
        <BlurView intensity={60} tint="dark" experimentalBlurMethod="dimezisBlurView" style={styles.ctx}>
          {canVideoCall && (
            <TouchableOpacity style={styles.item} activeOpacity={0.6} onPress={handle('videoCall')}>
              <IconVideoCamera size={20} color={theme.text} />
              <Text style={styles.itemText}>Видеозвонок</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.item} activeOpacity={0.6} onPress={handle('wallpaper')}>
            <IconWallpaper size={20} color={theme.text} />
            <Text style={styles.itemText}>Изменить обои</Text>
          </TouchableOpacity>
        </BlurView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  anchor: {
    position: 'absolute',
    right: 8,
    width: MENU_WIDTH,
  },
  ctx: {
    backgroundColor: 'rgba(15,12,41,0.78)',
    borderRadius: 12,
    padding: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  itemText: {
    fontSize: 16,
    color: theme.text,
    flex: 1,
  },
});
