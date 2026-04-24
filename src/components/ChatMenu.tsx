import { View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconVideoCamera, IconWallpaper } from './Icons';

export type ChatMenuAction = 'videoCall' | 'wallpaper';

type Props = {
  canVideoCall: boolean;
  onPick: (action: ChatMenuAction) => void;
  onClose: () => void;
};

export default function ChatMenu({ canVideoCall, onPick, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const top = (insets.top || 0) + 50;

  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback>
          <View style={[styles.menu, { top }]}>
            {canVideoCall && (
              <TouchableOpacity
                style={styles.item}
                activeOpacity={0.6}
                onPress={() => onPick('videoCall')}
              >
                <IconVideoCamera size={18} color="#fff" />
                <Text style={styles.itemText}>Видеозвонок</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.item}
              activeOpacity={0.6}
              onPress={() => onPick('wallpaper')}
            >
              <IconWallpaper size={18} color="#fff" />
              <Text style={styles.itemText}>Изменить обои</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 60,
  },
  menu: {
    position: 'absolute',
    right: 12,
    minWidth: 200,
    backgroundColor: 'rgba(28, 28, 40, 0.98)',
    borderRadius: 12,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
});
