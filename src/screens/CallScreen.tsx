import { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing, StatusBar as RNStatusBar, PanResponder, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RTCView } from 'react-native-webrtc';
import {
  IconCallSpeaker, IconCallVideo, IconCallMic, IconCallFlip, IconCallHangup,
  IconCheck, IconClose,
} from '../components/Icons';
import {
  subscribeCall, acceptCall, declineCall, end,
  toggleMute, toggleSpeaker, toggleCamera, flipCamera, swapVideos,
  type CallSnapshot,
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

const INITIAL_SNAP: CallSnapshot = {
  state: 'idle', peer: null, role: null, durationSec: 0,
  muted: false, speaker: true, callId: null,
  video: false, cameraOn: true, remoteVideoOn: true,
  cameraFacing: 'user', swapped: false,
  localStreamURL: null, remoteStreamURL: null,
};

// PIP геометрия (порт web-source/modules/style.css .call-vid-pip: 120×160)
const PIP_W = 120;
const PIP_H = 160;
const PIP_MARGIN = 16;
const PIP_BOTTOM = 140;
const DRAG_MIN = 8; // минимальный отступ от края экрана при drag

export default function CallScreen() {
  const insets = useSafeAreaInsets();
  const [snap, setSnap] = useState<CallSnapshot>(INITIAL_SNAP);

  useEffect(() => subscribeCall(setSnap), []);

  // Пульсация колец (только для аудио outgoing/incoming и видео incoming)
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const dot = useRef(new Animated.Value(0)).current;

  const showRings =
    (snap.state === 'outgoing' && !snap.video) ||
    snap.state === 'incoming';

  useEffect(() => {
    if (!showRings) { ring1.setValue(0); ring2.setValue(0); return; }
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
  }, [showRings]);

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

  // PIP drag
  const screen = Dimensions.get('window');
  const pipPos = useRef(new Animated.ValueXY({
    x: screen.width - PIP_W - PIP_MARGIN,
    y: screen.height - PIP_H - PIP_BOTTOM,
  })).current;
  const pipOffset = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
    onPanResponderGrant: () => {
      movedRef.current = false;
      pipOffset.current = { x: (pipPos.x as any)._value, y: (pipPos.y as any)._value };
    },
    onPanResponderMove: (_e, g) => {
      if (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3) movedRef.current = true;
      const nx = Math.max(DRAG_MIN, Math.min(screen.width - PIP_W - DRAG_MIN, pipOffset.current.x + g.dx));
      const ny = Math.max(DRAG_MIN + (insets.top || 0), Math.min(screen.height - PIP_H - DRAG_MIN, pipOffset.current.y + g.dy));
      pipPos.setValue({ x: nx, y: ny });
    },
    onPanResponderRelease: () => {
      if (!movedRef.current) swapVideos();
    },
  }), [screen.width, screen.height, insets.top]);

  if (snap.state === 'idle' || !snap.peer) return null;

  const peer = snap.peer;
  const avBg = getAvatarColor(peer);
  const avChar = peer.charAt(0).toUpperCase();
  const isVideo = snap.video;

  const ringScale1 = ring1.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.7] });
  const ringOp1 = ring1.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
  const ringScale2 = ring2.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.7] });
  const ringOp2 = ring2.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  const statusText =
    snap.state === 'outgoing' ? 'Запрос' :
    snap.state === 'incoming' ? (isVideo ? 'Видеовызов Мост…' : 'Аудиовызов Мост…') :
    'На связи';

  // — ACTIVE VIDEO: fullscreen remote + PIP local (или swap) —
  const showActiveVideo = snap.state === 'active' && isVideo;
  const fullscreenURL = snap.swapped ? snap.localStreamURL : snap.remoteStreamURL;
  const pipURL = snap.swapped ? snap.remoteStreamURL : snap.localStreamURL;
  const fullscreenIsRemote = !snap.swapped;
  const fullscreenVideoOn = fullscreenIsRemote ? snap.remoteVideoOn : snap.cameraOn;

  // — OUTGOING VIDEO: fullscreen локальная камера (если есть), иначе градиент —
  const showOutgoingVideoFullscreen = snap.state === 'outgoing' && isVideo && snap.cameraOn && !!snap.localStreamURL;

  return (
    <View style={[styles.root, { paddingTop: (RNStatusBar.currentHeight || 0) }]} pointerEvents="auto">
      {/* BG: градиент или fullscreen RTCView */}
      {showActiveVideo && fullscreenURL ? (
        <RTCView streamURL={fullscreenURL} style={StyleSheet.absoluteFill} objectFit="cover" />
      ) : showOutgoingVideoFullscreen ? (
        <RTCView streamURL={snap.localStreamURL!} style={StyleSheet.absoluteFill} objectFit="cover" />
      ) : (
        <LinearGradient
          colors={['#56b4f9', '#667eea', '#764ba2']}
          locations={[0, 0.35, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Fullscreen overlay: аватар пира если у него выключена камера в active */}
      {showActiveVideo && !fullscreenVideoOn && (
        <View style={styles.fullscreenAvatarOverlay}>
          <LinearGradient
            colors={['#56b4f9', '#667eea', '#764ba2']}
            locations={[0, 0.35, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.avatar, { backgroundColor: avBg }]}>
            <Text style={styles.avatarText}>{avChar}</Text>
          </View>
          <Text style={[styles.name, { marginTop: 20 }]} numberOfLines={1}>{peer}</Text>
        </View>
      )}

      {/* Speaker в правом верхнем (incoming + active video top-bar) */}
      {snap.state === 'incoming' && (
        <TouchableOpacity
          style={[styles.topRightBtn, { top: (insets.top || 14) + 4 }]}
          onPress={toggleSpeaker}
          activeOpacity={0.7}
        >
          <IconCallSpeaker size={22} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Top-bar для active video */}
      {showActiveVideo && (
        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']}
          style={[styles.topBar, { paddingTop: (insets.top || 14) + 6 }]}
        >
          <View style={styles.topBarInfo}>
            <Text style={styles.topBarName} numberOfLines={1}>{peer}</Text>
            <Text style={styles.topBarTimer}>{formatDuration(snap.durationSec)}</Text>
          </View>
          <TouchableOpacity onPress={toggleSpeaker} style={styles.topBarBtn} activeOpacity={0.7}>
            <IconCallSpeaker size={22} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>
      )}

      {/* Центральный блок — аватар/имя/статус — НЕ показываем в active video и в outgoing video c fullscreen */}
      {!showActiveVideo && !showOutgoingVideoFullscreen && (
        <View style={styles.center}>
          <View style={styles.avatarWrap}>
            {showRings && (
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
          {snap.state === 'incoming' && <Text style={styles.status}>{statusText}</Text>}
          {snap.state === 'active' && (
            <>
              <Text style={styles.status}>{statusText}</Text>
              <Text style={styles.timer}>{formatDuration(snap.durationSec)}</Text>
            </>
          )}
        </View>
      )}

      {/* Имя + статус поверх outgoing video fullscreen */}
      {showOutgoingVideoFullscreen && (
        <View style={[styles.outgoingVideoHeader, { paddingTop: (insets.top || 14) + 20 }]}>
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <Text style={styles.name} numberOfLines={1}>{peer}</Text>
          <View style={styles.statusRow}>
            <Text style={styles.status}>{statusText}</Text>
            <Animated.Text style={[styles.statusDot, { opacity: dot }]}> ●</Animated.Text>
          </View>
        </View>
      )}

      {/* PIP (локальное видео) — только в active video и только если cameraOn */}
      {showActiveVideo && pipURL && (
        (snap.swapped ? snap.remoteVideoOn : snap.cameraOn) && (
          <Animated.View
            style={[
              styles.pip,
              { transform: [{ translateX: pipPos.x }, { translateY: pipPos.y }] },
            ]}
            {...panResponder.panHandlers}
          >
            <RTCView streamURL={pipURL} style={StyleSheet.absoluteFill} objectFit="cover" zOrder={1} />
          </Animated.View>
        )
      )}

      {/* Нижние кнопки */}
      <View style={[styles.bottom, { paddingBottom: (insets.bottom || 0) + 36 }]}>
        {snap.state === 'outgoing' && (
          <View style={styles.rowActionRow}>
            <RoundBtn onPress={toggleSpeaker} active={snap.speaker}><IconCallSpeaker size={26} color="#fff" /></RoundBtn>
            {isVideo
              ? <RoundBtn onPress={flipCamera}><IconCallFlip size={26} color="#fff" /></RoundBtn>
              : null}
            <RoundBtn onPress={isVideo ? toggleCamera : undefined} disabled={!isVideo} active={isVideo && !snap.cameraOn}>
              <IconCallVideo size={26} color={isVideo ? '#fff' : 'rgba(255,255,255,0.45)'} />
            </RoundBtn>
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
          <View style={styles.rowActionRow}>
            <RoundBtn onPress={toggleSpeaker} active={snap.speaker}><IconCallSpeaker size={26} color="#fff" /></RoundBtn>
            {isVideo && <RoundBtn onPress={flipCamera}><IconCallFlip size={26} color="#fff" /></RoundBtn>}
            {isVideo && (
              <RoundBtn onPress={toggleCamera} active={!snap.cameraOn}>
                <IconCallVideo size={26} color="#fff" />
              </RoundBtn>
            )}
            <RoundBtn onPress={toggleMute} active={snap.muted}><IconCallMic size={26} color="#fff" /></RoundBtn>
            <RoundBtn onPress={() => end({ reason: 'ended' })} red big><IconCallHangup size={30} color="#fff" /></RoundBtn>
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
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingBottom: 16,
  },
  topBarInfo: { flex: 1, alignItems: 'flex-start' },
  topBarName: { fontSize: 20, fontWeight: '600', color: '#fff' },
  topBarTimer: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  topBarBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  outgoingVideoHeader: {
    position: 'absolute', top: 0, left: 0, right: 0,
    alignItems: 'center', paddingBottom: 24,
  },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
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
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)',
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
  fullscreenAvatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  pip: {
    position: 'absolute',
    width: PIP_W, height: PIP_H,
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: '#000',
    zIndex: 50, elevation: 10,
  },
  bottom: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 18,
  },
  rowActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  rowIncoming: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
  },
  roundBtn: {
    alignItems: 'center', justifyContent: 'center',
  },
});
