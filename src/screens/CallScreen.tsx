import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Easing, StatusBar as RNStatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IconCallSpeaker, IconCallVideo, IconCallMic, IconCallFlip, IconCallHangup,
  IconCheck, IconClose,
} from '../components/Icons';
import {
  subscribeCall, acceptCall, declineCall, end,
  toggleMute, toggleSpeaker, type CallSnapshot,
} from '../services/CallManager';

const AVATAR_COLORS = ['#E85D75','#6C5CE7','#00B894','#FDCB6E','#E17055','#0984E3','#A29BFE','#55EFC4'];
function getAvatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function CallScreen() {
  const insets = useSafeAreaInsets();
  const [snap, setSnap] = useState<CallSnapshot>(() => ({
    state: 'idle', peer: null, role: null, durationSec: 0, muted: false, speaker: true, callId: null,
  }));

  useEffect(() => {
    return subscribeCall(setSnap);
  }, []);

  // Пульсация колец (outgoing + incoming)
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const dot = useRef(new Animated.Value(0)).current;

  const pulsing = snap.state === 'outgoing' || snap.state === 'incoming';
  useEffect(() => {
    if (!pulsing) {
      ring1.setValue(0); ring2.setValue(0);
      return;
    }
    const make = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 2400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );
    const a = make(ring1, 0);
    const b = make(ring2, 1200);
    a.start(); b.start();
    return () => { a.stop(); b.stop(); };
  }, [pulsing]);

  // Мигающая точка "Запрос ●" для outgoing
  useEffect(() => {
    if (snap.state !== 'outgoing') { dot.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dot, { toValue: 0.2, duration: 500, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [snap.state]);

  if (snap.state === 'idle' || !snap.peer) return null;

  const peer = snap.peer;
  const avBg = getAvatarColor(peer);
  const avChar = peer.charAt(0).toUpperCase();

  const ringScale1 = ring1.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.7] });
  const ringOp1 = ring1.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
  const ringScale2 = ring2.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.7] });
  const ringOp2 = ring2.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  const statusText =
    snap.state === 'outgoing' ? 'Запрос' :
    snap.state === 'incoming' ? 'Аудиовызов Мост…' :
    'На связи';

  return (
    <View style={[styles.root, { paddingTop: (RNStatusBar.currentHeight || 0) }]} pointerEvents="auto">
      <LinearGradient
        colors={['#56b4f9', '#667eea', '#764ba2']}
        locations={[0, 0.35, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Speaker icon in top-right for incoming */}
      {snap.state === 'incoming' && (
        <TouchableOpacity
          style={[styles.topRightBtn, { top: (insets.top || 14) + 4 }]}
          onPress={toggleSpeaker}
          activeOpacity={0.7}
        >
          <IconCallSpeaker size={22} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Center block */}
      <View style={styles.center}>
        <View style={styles.avatarWrap}>
          {/* Pulsing rings */}
          {pulsing && (
            <>
              <Animated.View style={[styles.ring, { transform: [{ scale: ringScale1 }], opacity: ringOp1 }]} />
              <Animated.View style={[styles.ring, { transform: [{ scale: ringScale2 }], opacity: ringOp2 }]} />
            </>
          )}
          <View style={[styles.avatar, { backgroundColor: avBg }]}>
            <Text style={styles.avatarText}>{avChar}</Text>
          </View>
        </View>

        <Text style={styles.name} numberOfLines={1}>{peer}</Text>

        {snap.state === 'outgoing' && (
          <View style={styles.statusRow}>
            <Text style={styles.status}>{statusText}</Text>
            <Animated.Text style={[styles.statusDot, { opacity: dot }]}> ●</Animated.Text>
          </View>
        )}
        {snap.state === 'incoming' && (
          <Text style={styles.status}>{statusText}</Text>
        )}
        {snap.state === 'active' && (
          <>
            <Text style={styles.status}>{statusText}</Text>
            <Text style={styles.timer}>{formatDuration(snap.durationSec)}</Text>
          </>
        )}
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottom, { paddingBottom: (insets.bottom || 0) + 36 }]}>
        {snap.state === 'outgoing' && (
          <View style={styles.rowOutgoing}>
            <RoundBtn onPress={toggleSpeaker} active={snap.speaker}><IconCallSpeaker size={26} color="#fff" /></RoundBtn>
            <RoundBtn disabled><IconCallVideo size={26} color="rgba(255,255,255,0.45)" /></RoundBtn>
            <RoundBtn onPress={toggleMute} active={snap.muted}><IconCallMic size={26} color="#fff" /></RoundBtn>
            <RoundBtn onPress={() => end({ reason: 'cancelled' })} red><IconCallHangup size={28} color="#fff" /></RoundBtn>
          </View>
        )}

        {snap.state === 'incoming' && (
          <View style={styles.rowIncoming}>
            <RoundBtn onPress={declineCall} red big>
              <IconClose size={32} color="#fff" />
            </RoundBtn>
            <RoundBtn onPress={acceptCall} accept big>
              <IconCheck size={32} color="#fff" />
            </RoundBtn>
          </View>
        )}

        {snap.state === 'active' && (
          <View style={styles.rowActive}>
            <RoundBtn onPress={toggleMute} active={snap.muted}><IconCallMic size={26} color="#fff" /></RoundBtn>
            <RoundBtn onPress={() => end({ reason: 'ended' })} red big><IconCallHangup size={30} color="#fff" /></RoundBtn>
            <RoundBtn onPress={toggleSpeaker} active={snap.speaker}><IconCallSpeaker size={26} color="#fff" /></RoundBtn>
          </View>
        )}
      </View>
    </View>
  );
}

type RoundBtnProps = {
  onPress?: () => void;
  children: React.ReactNode;
  red?: boolean;
  accept?: boolean;
  active?: boolean;
  disabled?: boolean;
  big?: boolean;
};

function RoundBtn({ onPress, children, red, accept, active, disabled, big }: RoundBtnProps) {
  const size = big ? 64 : 56;
  const bg = red ? '#ff3b30' : accept ? '#4892f7' : active ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.15)';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.75}
      style={[styles.roundBtn, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}
    >
      {children}
    </TouchableOpacity>
  );
}

const RING_SIZE = 170;

const styles = StyleSheet.create({
  root: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 100,
    overflow: 'hidden',
  },
  topRightBtn: {
    position: 'absolute', right: 16,
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  avatarWrap: {
    width: RING_SIZE, height: RING_SIZE,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 26,
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE, height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  avatar: {
    width: RING_SIZE, height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 72, fontWeight: '700', color: '#fff' },
  name: { fontSize: 28, fontWeight: '600', color: '#fff', marginTop: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  status: { fontSize: 16, color: 'rgba(255,255,255,0.85)', marginTop: 10 },
  statusDot: { fontSize: 18, color: '#fff', marginTop: 10 },
  timer: { fontSize: 22, color: '#fff', fontWeight: '500', marginTop: 8, letterSpacing: 1 },
  bottom: {
    paddingHorizontal: 18,
  },
  rowOutgoing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  rowIncoming: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
  },
  rowActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
  },
  roundBtn: {
    alignItems: 'center', justifyContent: 'center',
  },
});
