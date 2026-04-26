import { useRef, useState, useCallback, useEffect, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { VideoView, useVideoPlayer } from 'expo-video';
import { IconPlay, IconPause } from './Icons';
import CallBubble from './CallBubble';
import { base64ToTempFile } from '../managers/MediaManager';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { SvgXml } from 'react-native-svg';
import { theme } from '../styles/theme';
import { ANIM_STICKERS } from '../utils/emoji';
import type { Message } from '../managers/ChatManager';
import ThanosSnap from './ThanosSnap';

type Props = {
  message: Message;
  isMe: boolean;
  isRead: boolean;
  showSender: boolean;
  onLongPress: (msg: Message) => void;
  onReactionPress: (msgKey: string, emoji: string) => void;
  onReply: (msg: Message) => void;
  onImagePress?: (url: string) => void;
  bubbleColor?: string;
  peer?: string;
  deleting?: boolean;
  armed?: boolean;
  onDeleteAnimComplete?: () => void;
};

const READ_COLOR = '#55EFC4';

function CheckMark({ read }: { read: boolean }) {
  return <Text style={[styles.check, read ? styles.checkRead : styles.checkSent]}>{read ? ' ✓✓' : ' ✓'}</Text>;
}

const SENDER_COLORS = ['#E85D75','#6C5CE7','#00B894','#FDCB6E','#E17055','#0984E3','#A29BFE','#55EFC4'];
function senderColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % SENDER_COLORS.length;
  return SENDER_COLORS[h];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}

const SWIPE_THRESHOLD = 60;

const SPEEDS = [1, 1.5, 2];

function barHeights(seed: string): number[] {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return Array.from({ length: 28 }, () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return 4 + (h % 19);
  });
}

function AudioBubble({ url, duration, msgKey }: { url: string; duration: string; msgKey: string }) {
  const [speedIdx, setSpeedIdx] = useState(0);
  const [listened, setListened] = useState(false);
  const [resolvedUri, setResolvedUri] = useState<string | null>(null);
  const heights = useRef(barHeights(msgKey)).current;

  useEffect(() => {
    if (!url) return;
    if (url.startsWith('data:')) {
      base64ToTempFile(url, 'm4a', msgKey)
        .then(path => setResolvedUri(path))
        .catch(e => console.error('[AudioBubble] base64 error', e));
    } else {
      setResolvedUri(url);
    }
  }, [url, msgKey]);

  const player = useAudioPlayer(resolvedUri ? { uri: resolvedUri } : { uri: '' });
  const status = useAudioPlayerStatus(player);

  const playing = status.playing;
  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;
  const playedCount = Math.floor(progress * 28);

  useEffect(() => {
    if (status.didJustFinish) {
      setListened(true);
      player.seekTo(0);
    }
  }, [status.didJustFinish]);

  const toggle = useCallback(() => {
    if (playing) player.pause();
    else player.play();
  }, [playing, player]);

  const cycleSpeed = useCallback(() => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    player.setPlaybackRate(SPEEDS[next]);
  }, [speedIdx, player]);

  return (
    <View style={styles.audioBubble}>
      <TouchableOpacity style={styles.audioPlayBtn} onPress={toggle} activeOpacity={0.85}>
        {playing ? <IconPause size={20} color="#667eea" /> : <IconPlay size={20} color="#667eea" />}
      </TouchableOpacity>
      <View style={styles.audioBody}>
        <View style={styles.audioWave}>
          {heights.map((h, i) => (
            <View key={i} style={[styles.audioBar, { height: h }, i < playedCount && styles.audioBarPlayed]} />
          ))}
        </View>
        <View style={styles.audioDurRow}>
          <Text style={styles.audioDur}>{duration || '0:00'}</Text>
          {!listened && <View style={styles.audioUnread} />}
        </View>
      </View>
      <TouchableOpacity onPress={cycleSpeed} style={styles.audioSpeedBtn}>
        <Text style={styles.audioSpeedText}>{SPEEDS[speedIdx]}x</Text>
      </TouchableOpacity>
    </View>
  );
}

const VID_SIZE = 200;

function VideoBubble({ url, duration, msgKey }: { url: string; duration: string; msgKey: string }) {
  const [resolvedUri, setResolvedUri] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const player = useVideoPlayer(resolvedUri ? { uri: resolvedUri } : null);

  useEffect(() => {
    const sub = player.addListener('playToEnd', () => {
      player.currentTime = 0;
      setPlaying(false);
    });
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    if (!url) return;
    if (url.startsWith('data:')) {
      base64ToTempFile(url, 'mp4', msgKey)
        .then(path => setResolvedUri(path))
        .catch(e => console.error('[VideoBubble] base64 error', e));
    } else {
      setResolvedUri(url);
    }
  }, [url, msgKey]);

  const toggle = useCallback(() => {
    if (!resolvedUri) return;
    if (playing) {
      player.pause();
      setPlaying(false);
    } else {
      player.play();
      setPlaying(true);
    }
  }, [playing, resolvedUri, player]);

  return (
    <TouchableOpacity onPress={toggle} activeOpacity={0.9} style={styles.vidWrap}>
      {resolvedUri ? (
        <VideoView
          player={player}
          style={styles.vidCircle}
          contentFit="cover"
          nativeControls={false}
        />
      ) : (
        <View style={[styles.vidCircle, { backgroundColor: '#111' }]} />
      )}
      <View style={styles.vidPlay}>
        {playing ? (
          <View style={styles.vidPauseIcon}>
            <View style={styles.vidPauseBar} />
            <View style={styles.vidPauseBar} />
          </View>
        ) : (
          <Text style={styles.vidPlayIcon}>▶</Text>
        )}
      </View>
      {duration ? (
        <View style={styles.vidDurBadge}>
          <Text style={styles.vidDurText}>{duration}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const MessageBubble = memo(function MessageBubble({ message: m, isMe, isRead, showSender, onLongPress, onReactionPress, onReply, onImagePress, bubbleColor, peer, deleting, armed, onDeleteAnimComplete }: Props) {
  if (m.system && (m.callDir || m.missed)) {
    return <CallBubble message={m} peer={peer || m.sender} />;
  }
  const translateX = useRef(new Animated.Value(0)).current;
  const replyOpacity = useRef(new Animated.Value(0)).current;

  const isRecent = Boolean(m.ts && (Date.now() - m.ts) < 3000);
  const entryOpacity = useRef(new Animated.Value(isRecent ? 0.5 : 1)).current;
  const entryTranslateY = useRef(new Animated.Value(isRecent ? 12 : 0)).current;
  const entryScale = useRef(new Animated.Value(isRecent ? 0.97 : 1)).current;

  useEffect(() => {
    if (!isRecent) return;
    Animated.parallel([
      Animated.timing(entryOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(entryTranslateY, { toValue: 0, duration: 350, useNativeDriver: true }),
      Animated.timing(entryScale, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  const reactionMap: Record<string, number> = {};
  if (m.reactions) {
    Object.values(m.reactions).forEach((r) => {
      if (r?.emoji) reactionMap[r.emoji] = (reactionMap[r.emoji] || 0) + 1;
    });
  }
  const reactionEntries = Object.entries(reactionMap);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true },
  );

  const onHandlerStateChange = (event: any) => {
    const { state, translationX } = event.nativeEvent;
    if (state === State.ACTIVE) {
      const clamped = Math.min(0, Math.max(translationX, -SWIPE_THRESHOLD));
      const progress = -clamped / SWIPE_THRESHOLD;
      replyOpacity.setValue(progress);
    }
    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      if (translationX <= -SWIPE_THRESHOLD) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
        onReply(m);
      }
      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 120, friction: 8 }),
        Animated.timing(replyOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  };

  const clampedTranslate = translateX.interpolate({
    inputRange: [-(SWIPE_THRESHOLD + 40), -SWIPE_THRESHOLD, 0],
    outputRange: [-(SWIPE_THRESHOLD + 10), -SWIPE_THRESHOLD, 0],
    extrapolate: 'clamp',
  });

  return (
    <ThanosSnap active={!!deleting} armed={!!armed} onComplete={onDeleteAnimComplete || (() => {})}>
    <Animated.View style={{ opacity: entryOpacity, transform: [{ translateY: entryTranslateY }, { scale: entryScale }] }}>
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      activeOffsetX={-10}
      failOffsetY={[-10, 10]}
    >
      <Animated.View style={[styles.row, isMe ? styles.rowMe : styles.rowOther]}>
        {/* Reply icon hint */}
        <Animated.View style={[
          styles.replyHint,
          isMe ? styles.replyHintMe : styles.replyHintOther,
          { opacity: replyOpacity },
        ]}>
          <Text style={styles.replyHintIcon}>↩️</Text>
        </Animated.View>

        <Animated.View style={{ transform: [{ translateX: clampedTranslate }] }}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => onLongPress(m)}>
            {showSender && !isMe && (
              <Text style={[styles.senderName, { color: senderColor(m.sender) }]}>{m.sender}</Text>
            )}
            {m.sticker && (
              <Text style={styles.stickerEmoji}>{m.sticker}</Text>
            )}
            {m.animSticker && (() => {
              const s = ANIM_STICKERS.find(a => a.id === m.animSticker);
              return s ? <SvgXml xml={s.svg} width={90} height={90} /> : null;
            })()}

            {m.image && (
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther, styles.imageBubble, isMe && bubbleColor ? { backgroundColor: bubbleColor } : undefined]}>
                <TouchableOpacity activeOpacity={0.85} onPress={() => onImagePress && m.image && onImagePress(m.image)}>
                  <Image source={{ uri: m.image }} style={styles.msgImage} resizeMode="cover" />
                </TouchableOpacity>
                <View style={styles.meta}>
                  <Text style={[styles.time, isMe ? styles.timeMe : styles.timeOther]}>{formatTime(m.ts)}</Text>
                  {isMe && <CheckMark read={isRead} />}
                </View>
              </View>
            )}
            {m.audio && (
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther, isMe && bubbleColor ? { backgroundColor: bubbleColor, shadowColor: bubbleColor } : undefined]}>
                <AudioBubble url={m.audio} duration={m.audioDur || '0:00'} msgKey={m._key} />
                <View style={styles.meta}>
                  <Text style={[styles.time, isMe ? styles.timeMe : styles.timeOther]}>{formatTime(m.ts)}</Text>
                  {isMe && <CheckMark read={isRead} />}
                </View>
              </View>
            )}
            {m.vidMsg && (
              <View>
                <VideoBubble url={m.vidMsg} duration={m.vidDur || ''} msgKey={m._key} />
                <View style={[styles.meta, { marginTop: 4 }]}>
                  <Text style={[styles.time, isMe ? styles.timeMe : styles.timeOther]}>{formatTime(m.ts)}</Text>
                  {isMe && <CheckMark read={isRead} />}
                </View>
              </View>
            )}
            {!m.sticker && !m.animSticker && !m.image && !m.audio && !m.vidMsg && (() => {
              const timeStr = formatTime(m.ts);
              return (
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther, isMe && bubbleColor ? { backgroundColor: bubbleColor, shadowColor: bubbleColor } : undefined]}>
                    {m.forwarded && (
                      <Text style={styles.forwarded}>↪ Переслано от {m.forwarded}</Text>
                    )}
                    {m.replyTo && (
                      <View style={styles.replyQuote}>
                        <View style={styles.replyLine} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.replyAuthor}>{m.replyTo.sender}</Text>
                          <Text style={styles.replyText} numberOfLines={1}>{m.replyTo.text || 'медиа'}</Text>
                        </View>
                      </View>
                    )}
                    {m.text ? (
                      <Text style={styles.text}>
                        {m.text}
                        {reactionEntries.length === 0 && <Text style={styles.timeSpacer}>{'\u00A0'.repeat(Math.ceil((( m.edited ? 5 : 0) + timeStr.length + (isMe ? 3 : 0)) * 1.4) + 3)}</Text>}
                      </Text>
                    ) : null}
                    {reactionEntries.length > 0 ? (
                      <View style={styles.metaRow}>
                        <View style={styles.metaReactions}>
                          {reactionEntries.map(([emoji, count]) => (
                            <TouchableOpacity key={emoji} style={styles.reactionBadge} onPress={() => onReactionPress(m._key, emoji)}>
                              <Text style={styles.reactionEmoji}>{emoji}</Text>
                              {count > 1 && <Text style={styles.reactionCount}>{count}</Text>}
                            </TouchableOpacity>
                          ))}
                        </View>
                        <View style={styles.metaTime}>
                          {m.edited && <Text style={styles.edited}>изм. </Text>}
                          <Text style={[styles.time, isMe ? styles.timeMe : styles.timeOther]}>{timeStr}</Text>
                          {isMe && <CheckMark read={isRead} />}
                        </View>
                      </View>
                    ) : (
                      <View style={styles.timeInline} pointerEvents="none">
                        {m.edited && <Text style={styles.edited}>изм. </Text>}
                        <Text style={[styles.time, isMe ? styles.timeMe : styles.timeOther]}>{timeStr}</Text>
                        {isMe && <CheckMark read={isRead} />}
                      </View>
                    )}
                  </View>
              );
            })()}
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </PanGestureHandler>
    </Animated.View>
    </ThanosSnap>
  );
}, (prev, next) =>
  prev.message._key === next.message._key &&
  prev.message.text === next.message.text &&
  prev.message.edited === next.message.edited &&
  prev.message.forwarded === next.message.forwarded &&
  prev.message.audio === next.message.audio &&
  prev.message.image === next.message.image &&
  prev.message.vidMsg === next.message.vidMsg &&
  prev.message.sticker === next.message.sticker &&
  JSON.stringify(prev.message.reactions) === JSON.stringify(next.message.reactions) &&
  prev.isMe === next.isMe &&
  prev.isRead === next.isRead &&
  prev.showSender === next.showSender &&
  prev.bubbleColor === next.bubbleColor &&
  prev.peer === next.peer &&
  prev.message.system === next.message.system &&
  prev.message.callDir === next.message.callDir &&
  prev.message.callDur === next.message.callDur &&
  prev.message.missed === next.message.missed &&
  prev.deleting === next.deleting &&
  prev.armed === next.armed
);

export default MessageBubble;

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 1.5, maxWidth: '85%' },
  rowMe: { alignSelf: 'flex-end' },
  rowOther: { alignSelf: 'flex-start' },

  replyHint: { position: 'absolute', top: '50%', marginTop: -14, zIndex: 1 },
  replyHintMe: { right: -32 },
  replyHintOther: { left: -32 },
  replyHintIcon: { fontSize: 20 },

  senderName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
    marginLeft: 10,
  },

  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 60,
  },
  bubbleMe: {
    backgroundColor: '#667eea',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  bubbleOther: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },

  replyQuote: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 6,
    paddingLeft: 0,
    marginBottom: 6,
    gap: 8,
    overflow: 'hidden',
  },
  replyLine: {
    width: 3,
    borderRadius: 0,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  replyAuthor: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginBottom: 1 },
  replyText: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  forwarded: { fontSize: 12, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', marginBottom: 4 },

  text: { fontSize: 16, lineHeight: 20.8, color: '#ffffff' },

  meta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 3, gap: 2 },
  timeInline: { position: 'absolute', right: 10, bottom: 6, flexDirection: 'row', alignItems: 'center' },
  timeSpacer: { fontSize: 16, color: 'transparent' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  metaReactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  metaTime: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 8 },
  edited: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  timeMe: { color: 'rgba(255,255,255,0.85)' },
  timeOther: { color: 'rgba(255,255,255,0.5)' },
  time: { fontSize: 12 },
  check: { fontSize: 11, marginLeft: 1 },
  checkSent: { color: 'rgba(255,255,255,0.85)' },
  checkRead: { color: READ_COLOR },

  stickerEmoji: { fontSize: 64, lineHeight: 72 },
  imageBubble: { padding: 4 },
  msgImage: { width: 220, height: 160, borderRadius: 10 },

  // Audio bubble — exact match web .m-audio
  audioBubble: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 200, paddingVertical: 4 },
  audioPlayBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  audioBody: { flex: 1, gap: 2 },
  audioWave: { flexDirection: 'row', alignItems: 'center', gap: 1.5, height: 24 },
  audioBar: { width: 2.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.5)' },
  audioBarPlayed: { backgroundColor: 'rgba(255,255,255,0.9)' },
  audioDurRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  audioDur: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  audioUnread: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.8)' },
  audioSpeedBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  audioSpeedText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  // Video message circle (web: .m-vidmsg 200x200 border-radius:50%)
  vidWrap: { position: 'relative', width: VID_SIZE, height: VID_SIZE },
  vidCircle: { width: VID_SIZE, height: VID_SIZE, borderRadius: VID_SIZE / 2, overflow: 'hidden', backgroundColor: '#000' },
  vidPlay: {
    position: 'absolute', top: '50%', left: '50%',
    marginTop: -20, marginLeft: -20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  vidPlayIcon: { color: '#fff', fontSize: 18, marginLeft: 3 },
  vidPauseIcon: { flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' },
  vidPauseBar: { width: 4, height: 16, borderRadius: 2, backgroundColor: '#fff' },
  vidDurBadge: {
    position: 'absolute', bottom: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  vidDurText: { color: '#fff', fontSize: 11 },

  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
});
