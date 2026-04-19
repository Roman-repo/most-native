import { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';

type Props = { color?: string; size?: number };

export default function TypingDots({ color = '#4CAF50', size = 4 }: Props) {
  const a1 = useRef(new Animated.Value(0.3)).current;
  const a2 = useRef(new Animated.Value(0.3)).current;
  const a3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const mkLoop = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.delay(600 - delay),
        ]),
      );
    const l1 = mkLoop(a1, 0);
    const l2 = mkLoop(a2, 200);
    const l3 = mkLoop(a3, 400);
    l1.start(); l2.start(); l3.start();
    return () => { l1.stop(); l2.stop(); l3.stop(); };
  }, [a1, a2, a3]);

  const dot = (opacity: Animated.Value) => (
    <Animated.View style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity }]} />
  );

  return (
    <View style={styles.row}>
      {dot(a1)}{dot(a2)}{dot(a3)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 4 },
  dot: {},
});
