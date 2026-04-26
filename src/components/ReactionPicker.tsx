import { useLayoutEffect, useRef, useState } from 'react';
import React from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet,
  Dimensions, Animated, Easing,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { theme } from '../styles/theme';
import { QUICK_REACTIONS, ALL_EMOJIS } from '../utils/emoji';
import {
  IconCtxReply, IconCtxCopy, IconCtxForward, IconCtxPin,
  IconCtxEdit, IconCtxDelete, IconCtxPrivate,
} from './Icons';

type Props = {
  visible: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onCopy?: () => void;
  onForward?: () => void;
  onPin?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPrivate?: () => void;
  isMe: boolean;
  isPinned?: boolean;
  canEdit?: boolean;
  canPrivate?: boolean;
};

const ICON_PLUS = '+';
const DELETE_COLOR = '#e74c3c';

export default function ReactionPicker({
  visible, onClose,
  onReact, onReply, onCopy, onForward, onPin, onEdit, onDelete, onPrivate,
  isMe, isPinned, canEdit, canPrivate,
}: Props) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [showAllEmoji, setShowAllEmoji] = useState(false);

  useLayoutEffect(() => {
    if (visible) {
      setShowAllEmoji(false);
      scale.setValue(0.92); translateY.setValue(8); opacity.setValue(0);
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

  const handle = (fn?: () => void) => () => {
    if (fn) fn();
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={close} />
      <Animated.View
        pointerEvents="box-none"
        style={[styles.anchor, { opacity, transform: [{ scale }, { translateY }] }]}
      >
        <BlurView intensity={60} tint="dark" experimentalBlurMethod="dimezisBlurView" style={styles.ctx}>
          {/* Быстрые реакции */}
          <View style={styles.qrRow}>
            {QUICK_REACTIONS.map((e) => (
              <TouchableOpacity key={e} style={styles.qrBtn} onPress={() => { onReact(e); close(); }}>
                <Text style={styles.qrEmoji}>{e}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.qrMoreBtn} onPress={() => setShowAllEmoji(v => !v)}>
              <Text style={styles.qrMoreTxt}>{ICON_PLUS}</Text>
            </TouchableOpacity>
          </View>

          {showAllEmoji && (
            <View style={styles.allEmojiWrap}>
              <ScrollView contentContainerStyle={styles.allEmojiContent}>
                {ALL_EMOJIS.map((e, i) => (
                  <TouchableOpacity key={`${e}_${i}`} onPress={() => { onReact(e); close(); }}>
                    <Text style={styles.allEmojiItem}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Пункты меню */}
          <MenuItem icon={<IconCtxReply size={20} color={theme.text} />} label="Ответить" onPress={handle(onReply)} />
          {onCopy && <MenuItem icon={<IconCtxCopy size={20} color={theme.text} />} label="Копировать" onPress={handle(onCopy)} />}
          {onForward && <MenuItem icon={<IconCtxForward size={20} color={theme.text} />} label="Переслать" onPress={handle(onForward)} />}
          {onPin && <MenuItem icon={<IconCtxPin size={20} color={theme.text} />} label={isPinned ? 'Открепить' : 'Закрепить'} onPress={handle(onPin)} />}
          {isMe && canEdit && onEdit && <MenuItem icon={<IconCtxEdit size={20} color={theme.text} />} label="Редактировать" onPress={handle(onEdit)} />}
          {isMe && onDelete && <MenuItem icon={<IconCtxDelete size={20} color={DELETE_COLOR} />} label="Удалить" color={DELETE_COLOR} onPress={handle(onDelete)} />}
          {canPrivate && onPrivate && <MenuItem icon={<IconCtxPrivate size={20} color={theme.text} />} label="Написать лично" onPress={handle(onPrivate)} />}
        </BlurView>
      </Animated.View>
    </Modal>
  );
}

function MenuItem({ icon, label, color, onPress }: { icon: React.ReactNode; label: string; color?: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.cti} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.ctiIconWrap}>{icon}</View>
      <Text style={[styles.ctiLabel, color ? { color } : undefined]}>{label}</Text>
    </TouchableOpacity>
  );
}

const WIN = Dimensions.get('window');
const MENU_WIDTH = Math.min(280, WIN.width - 40);

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  anchor: {
    position: 'absolute',
    top: WIN.height / 2 - 200,
    left: (WIN.width - MENU_WIDTH) / 2,
    width: MENU_WIDTH,
  },

  /* .ctx — background var(--bg2) rgba(15,12,41,.78), blur 20, radius 12, padding 3, min-width 170 */
  ctx: {
    backgroundColor: 'rgba(15,12,41,0.78)',
    borderRadius: 12,
    padding: 3,
    minWidth: 170,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  /* Быстрые реакции: flex gap:3px, padding:5px 8px */
  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  qrBtn: { flex: 1, alignItems: 'center', padding: 3 },
  qrEmoji: { fontSize: 22 },
  qrMoreBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  qrMoreTxt: { fontSize: 16, color: theme.text2, fontWeight: '600' },

  allEmojiWrap: {
    maxHeight: 200,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  allEmojiContent: { flexDirection: 'row', flexWrap: 'wrap', padding: 6 },
  allEmojiItem: { fontSize: 24, padding: 5 },

  /* .cti — padding 12/16, font-size 16, border-radius 8 */
  cti: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 12,
  },
  ctiIconWrap: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  ctiLabel: { fontSize: 16, color: theme.text, flex: 1 },
});
