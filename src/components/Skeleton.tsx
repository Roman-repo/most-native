import { useEffect, useRef } from 'react';
import {
  View, Animated, StyleSheet, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W } = Dimensions.get('window');

/* ---------- types ---------- */
type SkeletonProps = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
};

/* ---------- shimmer colors ---------- */
const BG = 'rgba(255,255,255,0.06)';
const SHIMMER = ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.02)'] as const;

/* ---------- component ---------- */
export default function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const translateX = useRef(new Animated.Value(-SCREEN_W)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(translateX, {
        toValue: SCREEN_W,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => { anim.stop(); };
  }, []);

  const w = typeof width === 'number' ? width : undefined;

  return (
    <View style={[{ width, height, borderRadius, backgroundColor: BG, overflow: 'hidden' }, w !== undefined && { width: w }, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX }] },
        ]}
      >
        <LinearGradient
          colors={SHIMMER}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}
