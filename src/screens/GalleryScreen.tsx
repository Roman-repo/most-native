import { useCallback, useState, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedScrollHandler, interpolate, Extrapolation, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const AnimatedFlatList = Animated.createAnimatedComponent(Animated.FlatList<string>);

type Props = {
  images: string[];
  initialIndex: number;
  onClose: () => void;
};

function GalleryItem({ item, index, scrollX, onPress }: {
  item: string;
  index: number;
  scrollX: SharedValue<number>;
  onPress: () => void;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_W,
      index * SCREEN_W,
      (index + 1) * SCREEN_W,
    ];

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.88, 1, 0.88],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.5, 1, 0.5],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <View style={{ width: SCREEN_W, height: SCREEN_H }}>
      <TouchableOpacity activeOpacity={1} onPress={onPress} style={StyleSheet.absoluteFillObject}>
        <Animated.View style={[{ width: SCREEN_W, height: SCREEN_H }, animatedStyle]}>
          <Image
            source={{ uri: item }}
            style={StyleSheet.absoluteFillObject}
            contentFit="contain"
            cachePolicy="memory-disk"
            allowDownscaling
            recyclingKey={item}
          />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const MemoGalleryItem = memo(GalleryItem);

export default function GalleryScreen({ images, initialIndex, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex);
  const [headerVisible, setHeaderVisible] = useState(true);
  const scrollX = useSharedValue(initialIndex * SCREEN_W);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const toggleHeader = useCallback(() => setHeaderVisible((v) => !v), []);

  const renderItem = useCallback(({ item, index: i }: { item: string; index: number }) => (
    <MemoGalleryItem item={item} index={i} scrollX={scrollX} onPress={toggleHeader} />
  ), [toggleHeader, scrollX]);

  const onMomentumScrollEnd = useCallback((e: any) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setIndex(newIndex);
  }, []);

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
        <AnimatedFlatList
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(data, index) => ({
            length: SCREEN_W,
            offset: SCREEN_W * index,
            index,
          })}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          onScroll={scrollHandler}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
          windowSize={3}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
        />

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
