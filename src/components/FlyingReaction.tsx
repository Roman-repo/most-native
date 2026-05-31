import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Props = {
  emoji: string;
  onComplete: () => void;
};

export default function FlyingReaction({ emoji, onComplete }: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start(() => onComplete());
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -SCREEN_H * 0.4] });
  const scale = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.5, 1.5, 1.2] });
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }, { scale }], opacity }]}>
      <Animated.Text style={styles.emoji}>{emoji}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SCREEN_W / 2 - 40,
    top: SCREEN_H / 2 - 40,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  emoji: { fontSize: 60 },
});
