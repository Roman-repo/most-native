import { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import Svg, { Circle } from 'react-native-svg';
import { IconSend } from './Icons';
import { theme } from '../styles/theme';

const SIZE = 240;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const MAX_SEC = 30;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  onSend: (uri: string, duration: number) => void;
  onCancel: () => void;
};

export default function VideoRecorder({ onSend, onCancel }: Props) {
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const isCancelRef = useRef(false);
  const durationRef = useRef(0);
  const recordingStartedRef = useRef(false);

  useEffect(() => {
    (async () => {
      if (!camPerm?.granted) await requestCamPerm();
      if (!micPerm?.granted) await requestMicPerm();
    })();
  }, []);

  const startRec = useCallback(async () => {
    if (recordingStartedRef.current) return;
    recordingStartedRef.current = true;
    try {
      const result = await (cameraRef.current as any).recordAsync({ maxDuration: MAX_SEC, quality: '480p' });
      if (isCancelRef.current) {
        onCancel();
      } else if (!result?.uri) {
        console.warn('[VideoRecorder] recordAsync returned no uri, result:', result);
        onCancel();
      } else {
        onSend(result.uri, durationRef.current);
      }
    } catch (e) {
      console.error('[VideoRecorder] record error:', e);
      onCancel();
    }
  }, [onSend, onCancel]);

  useEffect(() => {
    if (!cameraReady) return;
    startRec();
    timerRef.current = setInterval(() => {
      durationRef.current += 1;
      setSeconds(s => {
        if (durationRef.current >= MAX_SEC) {
          clearInterval(timerRef.current!);
          (cameraRef.current as any)?.stopRecording();
        }
        return s + 1;
      });
    }, 1000);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: MAX_SEC * 1000,
      useNativeDriver: false,
    }).start();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [cameraReady]);

  const handleSend = useCallback(() => {
    isCancelRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    progressAnim.stopAnimation();
    (cameraRef.current as any)?.stopRecording();
  }, []);

  const handleCancel = useCallback(() => {
    isCancelRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    progressAnim.stopAnimation();
    (cameraRef.current as any)?.stopRecording();
  }, []);

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const timerLabel = `${m}:${String(s).padStart(2, '0')}`;

  return (
    <View style={styles.overlay}>
      <View style={styles.circleWrap}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          mode="video"
          onCameraReady={() => setCameraReady(true)}
        />
        {/* Progress ring */}
        <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            stroke="rgba(255,255,255,0.2)" strokeWidth={STROKE} fill="none"
          />
          <AnimatedCircle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            stroke="#E85D75" strokeWidth={STROKE} fill="none"
            strokeDasharray={`${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset as any}
            strokeLinecap="round"
            rotation="-90"
            origin={`${SIZE / 2}, ${SIZE / 2}`}
          />
        </Svg>
        {/* Rec dot */}
        <View style={styles.recDot} />
      </View>

      <Text style={styles.timer}>{timerLabel}</Text>

      <View style={styles.controls}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn} activeOpacity={0.7} delayPressIn={0}>
          <Text style={styles.cancelText}>ОТМЕНА</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSend} style={styles.sendBtn} activeOpacity={0.8} delayPressIn={0}>
          <IconSend size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.93)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  circleWrap: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  recDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E85D75',
  },
  timer: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 28,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 48,
    marginTop: 40,
  },
  cancelBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  cancelText: { color: theme.accent, fontSize: 15, fontWeight: '500', letterSpacing: 0.5 },
  sendBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: theme.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 6,
  },
});
