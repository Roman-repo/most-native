import { useRef, useState, useCallback, useEffect, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { VideoView, useVideoPlayer } from 'expo-video';
import { IconPlay, IconPause, IconFile, IconReply } from './Icons';
import CallBubble from './CallBubble';
import { base64ToTempFile } from '../managers/MediaManager';
import * as Haptics from 'expo-haptics';
import AnimStickerWebView from './AnimStickerWebView';
import { theme } from '../styles/theme';
import { ANIM_STICKERS } from '../utils/emoji';
import type { Message } from '../managers/ChatManager';

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
  /** Called with bubble's outer View ref while mounted; null on unmount. */
  registerBubbleRef?: (key: string, ref: any) => void;
  onLayoutBubble?: (key: string, y: number, height: number) => void;
  onShowReaders?: (msgKey: string, ts: number) => void;
  isGroup?: boolean;
  onDoubleTap?: (msg: Message) => void; // kept for API compat, no longer used
};

const READ_COLOR = '#55EFC4';

function CheckMark({ read, onPress }: { read: boolean; onPress?: () => void }) {
  const mark = <Text style={[styles.check, read ? styles.checkRead : styles.checkSent]}>{read ? ' ✓✓' : ' ✓'}</Text>;
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.6} hitSlop={6}>
        {mark}
      </TouchableOpacity>
    );
  }
  return mark;
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

// const SWIPE_THRESHOLD = 60; // disabled for performance

const SPEEDS = [1, 1.5, 2];

function barHeights(seed: string): number[] {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return Array.from({ length: 28 }, () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return 4 + (h % 19);
  });
}

const audioUriCache = new Map<string, string>();

function AudioBubble({ url, duration, msgKey }: { url: string; duration: string; msgKey: string }) {
  const [speedIdx, setSpeedIdx] = useState(0);
  const [listened, setListened] = useState(false);
  const [resolvedUri, setResolvedUri] = useState<string | null>(() => audioUriCache.get(msgKey) ?? null);
  const heights = useRef(barHeights(msgKey)).current;

  useEffect(() => {
    if (!url) return;
    const cached = audioUriCache.get(msgKey);
    if (cached) { setResolvedUri(cached); return; }
    if (url.startsWith('data:')) {
      base64ToTempFile(url, 'm4a', msgKey)
        .then(path => { audioUriCache.set(msgKey, path); setResolvedUri(path); })
        .catch(e => console.error('[AudioBubble] base64 error', e));
    } else {
      audioUriCache.set(msgKey, url);
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

const videoUriCache = new Map<string, string>();

function VideoBubble({ url, duration, msgKey }: { url: string; duration: string; msgKey: string }) {
  const [resolvedUri, setResolvedUri] = useState<string | null>(() => videoUriCache.get(msgKey) ?? null);
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
    const cached = videoUriCache.get(msgKey);
    if (cached) { setResolvedUri(cached); return; }
    if (url.startsWith('data:')) {
      base64ToTempFile(url, 'mp4', msgKey)
        .then(path => { videoUriCache.set(msgKey, path); setResolvedUri(path); })
        .catch(e => console.error('[VideoBubble] base64 error', e));
    } else {
      videoUriCache.set(msgKey, url);
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

function AnimatedReactionBadge({ emoji, count, onPress }: { emoji: string; count: number; onPress: () => void }) {
  const scale = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  }, []);

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.35, duration: 120, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    onPress();
  }, [onPress, pulse]);

  const animScale = Animated.multiply(scale, pulse);

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View style={[styles.reactionBadge, { transform: [{ scale: animScale }] }]}>
        <Text style={styles.reactionEmoji}>{emoji}</Text>
        {count > 1 && <Text style={styles.reactionCount}>{count}</Text>}
      </Animated.View>
    </TouchableOpacity>
  );
}

const MAX_LINES = 8;

const MessageBubble = memo(function MessageBubble({ message: m, isMe, isRead, showSender, onLongPress, onReactionPress, onReply, onImagePress, bubbleColor, peer, deleting, registerBubbleRef, onLayoutBubble, onShowReaders, isGroup }: Props) {
  const outerViewRef = useRef<any>(null);
  const [expanded, setExpanded] = useState(false);
  const [needsExpand, setNeedsExpand] = useState(false);

  // Register outer View ref with parent so singleton ThanosSnap can capture it
  useEffect(() => {
    if (!registerBubbleRef) return;
    if (outerViewRef.current) registerBubbleRef(m._key, outerViewRef.current);
    return () => { registerBubbleRef(m._key, null); };
  }, [m._key, registerBubbleRef]);

  const handleLayout = useCallback((e: any) => {
    if (!onLayoutBubble) return;
    const { y, height } = e.nativeEvent.layout;
    onLayoutBubble(m._key, y, height);
  }, [m._key, onLayoutBubble]);

  if (m.system && (m.callDir || m.missed)) {
    return <CallBubble message={m} peer={peer || m.sender} />;
  }

  const reactionMap: Record<string, number> = {};
  if (m.reactions) {
    Object.values(m.reactions).forEach((r) => {
      if (r?.emoji) reactionMap[r.emoji] = (reactionMap[r.emoji] || 0) + 1;
    });
  }
  const reactionEntries = Object.entries(reactionMap);

  const readersPress = isMe && isGroup && onShowReaders ? () => onShowReaders(m._key, m.ts) : undefined;

  const fileExt = m.fileName ? m.fileName.split('.').pop()?.toUpperCase() : '';

  const handleLongPressBubble = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    onLongPress(m);
  }, [m, onLongPress]);

  const swipeableRef = useRef<Swipeable>(null);

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={() => (
        <View style={styles.replyAction}>
          <IconReply size={22} color={theme.accent} />
        </View>
      )}
      onSwipeableWillOpen={() => {
        Haptics.selectionAsync().catch(() => {});
      }}
      onSwipeableLeftOpen={() => {
        onReply(m);
        swipeableRef.current?.close();
      }}
      leftThreshold={60}
      rightThreshold={9999}
      friction={1.5}
      overshootLeft={false}
    >
    <View
      ref={outerViewRef}
      collapsable={false}
      style={[styles.row, isMe ? styles.rowMe : styles.rowOther, m.image && styles.rowImage, deleting && { opacity: 0 }]}
      onLayout={handleLayout}
    >
      <TouchableOpacity activeOpacity={0.85} onPress={() => onLongPress(m)}>
            {showSender && !isMe && (
              <Text style={[styles.senderName, { color: senderColor(m.sender) }]}>{m.sender}</Text>
            )}
            {m.sticker && (
              <Text style={styles.stickerEmoji}>{m.sticker}</Text>
            )}
            {m.animSticker && (() => {
              const s = ANIM_STICKERS.find(a => a.id === m.animSticker);
              return s ? <AnimStickerWebView svg={s.svg} width={90} height={90} /> : null;
            })()}

            {m.image && (
              <View style={[styles.imageWrap, isMe ? styles.imageWrapMe : styles.imageWrapOther]}>
                <TouchableOpacity activeOpacity={0.85} onPress={() => onImagePress && m.image && onImagePress(m.image)} onLongPress={() => onLongPress(m)}>
                  <View style={{ borderRadius: 14, overflow: 'hidden' }}>
                    <Image source={{ uri: m.image }} style={styles.msgImage} resizeMode="cover" />
                  </View>
                </TouchableOpacity>
                <View style={[styles.meta, styles.metaImage]}>
                  <Text style={[styles.time, styles.timeImage]}>{formatTime(m.ts)}</Text>
                  {isMe && <CheckMark read={isRead} onPress={readersPress} />}
                </View>
              </View>
            )}
            {m.audio && (
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther, isMe && bubbleColor ? { backgroundColor: bubbleColor, shadowColor: bubbleColor } : undefined]}>
                <AudioBubble url={m.audio} duration={m.audioDur || '0:00'} msgKey={m._key} />
                <View style={styles.meta}>
                  <Text style={[styles.time, isMe ? styles.timeMe : styles.timeOther]}>{formatTime(m.ts)}</Text>
                  {isMe && <CheckMark read={isRead} onPress={readersPress} />}
                </View>
              </View>
            )}
            {m.vidMsg && (
              <View>
                <VideoBubble url={m.vidMsg} duration={m.vidDur || ''} msgKey={m._key} />
                <View style={[styles.meta, { marginTop: 4 }]}>
                  <Text style={[styles.time, isMe ? styles.timeMe : styles.timeOther]}>{formatTime(m.ts)}</Text>
                  {isMe && <CheckMark read={isRead} onPress={readersPress} />}
                </View>
              </View>
            )}
            {m.file && (
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther, isMe && bubbleColor ? { backgroundColor: bubbleColor, shadowColor: bubbleColor } : undefined]}>
                <View style={styles.fileRow}>
                  <View style={styles.fileIconWrap}>
                    <IconFile size={24} color="#fff" />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>{m.fileName || 'Файл'}</Text>
                    <Text style={styles.fileSize}>{m.fileSize || ''}{m.fileSize && fileExt ? ', ' : ''}{fileExt}</Text>
                  </View>
                </View>
                <View style={styles.meta}>
                  <Text style={[styles.time, isMe ? styles.timeMe : styles.timeOther]}>{formatTime(m.ts)}</Text>
                  {isMe && <CheckMark read={isRead} onPress={readersPress} />}
                </View>
              </View>
            )}
            {m.contactName && (
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther, isMe && bubbleColor ? { backgroundColor: bubbleColor, shadowColor: bubbleColor } : undefined]}>
                <View style={styles.contactRow}>
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactAvatarText}>{m.contactName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName} numberOfLines={1}>{m.contactName}</Text>
                    <Text style={styles.contactPhone}>{m.contactPhone || ''}</Text>
                  </View>
                </View>
                <View style={styles.meta}>
                  <Text style={[styles.time, isMe ? styles.timeMe : styles.timeOther]}>{formatTime(m.ts)}</Text>
                  {isMe && <CheckMark read={isRead} onPress={readersPress} />}
                </View>
              </View>
            )}
            {!m.sticker && !m.animSticker && !m.image && !m.audio && !m.vidMsg && !m.file && !m.contactName && (() => {
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
                      <Text
                        style={styles.text}
                        numberOfLines={expanded ? undefined : MAX_LINES}
                        onTextLayout={(e) => {
                          if (!expanded && e.nativeEvent.lines.length > MAX_LINES) {
                            setNeedsExpand(true);
                          }
                        }}
                      >
                        {m.text}
                        {reactionEntries.length === 0 && !needsExpand && <Text style={styles.timeSpacer}>{'\u00A0'.repeat(Math.ceil((( m.edited ? 5 : 0) + timeStr.length + (isMe ? 3 : 0)) * 1.4) + 3)}</Text>}
                      </Text>
                    ) : null}
                    {needsExpand && (
                      <Text style={styles.expandBtn} onPress={() => setExpanded(v => !v)}>
                        {expanded ? 'Свернуть' : 'Читать далее'}
                      </Text>
                    )}
                    {reactionEntries.length > 0 ? (
                      <View style={styles.metaRow}>
                        <View style={styles.metaReactions}>
                          {reactionEntries.map(([emoji, count]) => (
                            <AnimatedReactionBadge
                              key={emoji}
                              emoji={emoji}
                              count={count}
                              onPress={() => onReactionPress(m._key, emoji)}
                            />
                          ))}
                        </View>
                        <View style={styles.metaTime}>
                          {m.edited && <Text style={styles.edited}>изм. </Text>}
                          <Text style={[styles.time, isMe ? styles.timeMe : styles.timeOther]}>{timeStr}</Text>
                          {isMe && <CheckMark read={isRead} onPress={readersPress} />}
                        </View>
                      </View>
                    ) : (
                      <View style={styles.timeInline} pointerEvents="none">
                        {m.edited && <Text style={styles.edited}>изм. </Text>}
                        <Text style={[styles.time, isMe ? styles.timeMe : styles.timeOther]}>{timeStr}</Text>
                        {isMe && <CheckMark read={isRead} onPress={readersPress} />}
                      </View>
                    )}
                  </View>
              );
            })()}
      </TouchableOpacity>
    </View>
    </Swipeable>
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
  prev.message.file === next.message.file &&
  prev.message.fileName === next.message.fileName &&
  prev.message.fileSize === next.message.fileSize &&
  prev.message.contactName === next.message.contactName &&
  prev.message.contactPhone === next.message.contactPhone &&
  prev.deleting === next.deleting &&
  prev.isGroup === next.isGroup &&
  prev.onShowReaders === next.onShowReaders
);

export default MessageBubble;

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 1.5, maxWidth: '85%' },
  rowImage: { paddingHorizontal: 4, maxWidth: '92%' },
  rowMe: { alignSelf: 'flex-end' },
  rowOther: { alignSelf: 'flex-start' },


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
  expandBtn: { fontSize: 14, color: theme.accent, fontWeight: '600', marginTop: 4, marginBottom: 2 },

  meta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 3, gap: 2 },
  metaImage: { position: 'absolute', right: 8, bottom: 6, marginTop: 0 },
  timeImage: { color: 'rgba(255,255,255,0.9)', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
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
  imageWrap: { position: 'relative', borderRadius: 14, overflow: 'hidden' },
  imageWrapMe: { alignSelf: 'flex-end' },
  imageWrapOther: { alignSelf: 'flex-start' },
  msgImage: { width: 280, height: 200, borderRadius: 0 },

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

  // File bubble
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 200 },
  fileIconWrap: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  fileInfo: { flex: 1, gap: 2 },
  fileName: { fontSize: 14, fontWeight: '500', color: '#fff' },
  fileSize: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },

  // Contact bubble
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 200 },
  contactAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  contactAvatarText: { fontSize: 20, fontWeight: '600', color: '#fff' },
  contactInfo: { flex: 1, gap: 2 },
  contactName: { fontSize: 15, fontWeight: '600', color: '#fff' },
  contactPhone: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  // Swipe-to-reply
  replyAction: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
