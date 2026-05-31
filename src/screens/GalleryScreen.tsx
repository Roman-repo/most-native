import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  images: string[];
  initialIndex: number;
  onClose: () => void;
};

export default function GalleryScreen({ images, initialIndex, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex);
  const [headerVisible, setHeaderVisible] = useState(true);

  const toggleHeader = useCallback(() => setHeaderVisible((v) => !v), []);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar style="light" />
      <View style={styles.root}>
        <PagerView
          style={styles.pager}
          initialPage={initialIndex}
          onPageSelected={(e) => setIndex(e.nativeEvent.position)}
          scrollEnabled
        >
          {images.map((img, i) => (
            <View key={i} style={styles.page}>
              <TouchableOpacity activeOpacity={1} onPress={toggleHeader} style={StyleSheet.absoluteFillObject}>
                <Image
                  source={{ uri: img }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  allowDownscaling
                  recyclingKey={img}
                />
              </TouchableOpacity>
            </View>
          ))}
        </PagerView>

        {headerVisible && (
          <View style={[styles.header, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
            <Text style={styles.counter}>
              {images.length > 1 ? `${index + 1} из ${images.length}` : ''}
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7} hitSlop={12}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  pager: { flex: 1 },
  page: { flex: 1 },
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  counter: { color: '#fff', fontSize: 15, fontWeight: '500' },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
