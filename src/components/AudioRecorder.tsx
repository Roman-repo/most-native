import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  RecordingPresets,
  AudioModule,
} from 'expo-audio';
import { theme } from '../styles/theme';
import { IconSend } from './Icons';

type Props = {
  onSend: (uri: string, duration: number) => void;
  onCancel: () => void;
};

const BAR_COUNT = 24;

export default function AudioRecorder({ onSend, onCancel }: Props) {
  const urlRef = useRef<string | null>(null);
  const deciseconds = useRef(0);

  const recorder = useAudioRecorder(
    { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true },
    (status) => {
      if (status.url) urlRef.current = status.url;
    },
  );
  const state = useAudioRecorderState(recorder, 80);

  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(4));
  const [displayTime, setDisplayTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dotAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state.metering !== undefined) {
      const norm = Math.max(0, (state.metering + 60) / 60);
      setBars(prev => [...prev.slice(1), Math.max(4, Math.round(norm * 28))]);
    }
  }, [state.metering]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1.4, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    timerRef.current = setInterval(() => {
      deciseconds.current += 1;
      setDisplayTime(d => d + 1);
    }, 100);

    (async () => {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) { onCancel(); return; }
      await AudioModule.setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    })();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSend = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      await recorder.stop();
      const uri = urlRef.current ?? recorder.uri;
      const durationSec = Math.floor(deciseconds.current / 10);
      console.log('[AudioRecorder] stop uri:', uri, 'dur:', durationSec);
      if (uri && durationSec >= 1) onSend(uri, durationSec);
      else onCancel();
    } catch (e) {
      console.error('[AudioRecorder] stop error:', e);
      onCancel();
    }
  }, [recorder, onSend, onCancel]);

  const handleCancel = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    recorder.stop().catch(() => {});
    onCancel();
  }, [recorder, onCancel]);

  const d = displayTime;
  const deci = d % 10;
  const secs = Math.floor(d / 10) % 60;
  const mins = Math.floor(d / 600);
  const timerLabel = `${mins}:${String(secs).padStart(2, '0')},${deci}`;

  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <Animated.View style={[styles.dot, { transform: [{ scale: dotAnim }] }]} />
        <Text style={styles.timer}>{timerLabel}</Text>
      </View>
      <View style={styles.wave}>
        {bars.map((h, i) => (
          <View key={i} style={[styles.waveBar, { height: h }]} />
        ))}
      </View>
      <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
        <Text style={styles.cancelText}>ОТМЕНА</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
        <IconSend size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 28,
    backgroundColor: 'rgba(15,12,41,0.95)',
    borderTopWidth: 1,
    borderTopColor: theme.border,
    gap: 8,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E85D75' },
  timer: { fontSize: 15, fontWeight: '600', color: theme.text, fontVariant: ['tabular-nums'], minWidth: 52 },
  wave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 32, overflow: 'hidden' },
  waveBar: { width: 3, backgroundColor: '#E85D75', borderRadius: 2, minHeight: 4 },
  cancelBtn: { paddingHorizontal: 4 },
  cancelText: { color: theme.accent, fontSize: 13, fontWeight: '500', letterSpacing: 0.5 },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
});
