import { AppState, AppStateStatus } from 'react-native';
import { ref, onValue, onDisconnect, set, off, serverTimestamp } from 'firebase/database';
import { db } from './firebase';

const HEARTBEAT_MS = 15_000;
const ONLINE_THRESHOLD_MS = 45_000;

export type PresenceState = { online: boolean; lastSeenTs: number | null };

export function startPresence(user: string): () => void {
  if (!user) return () => {};

  const onlineRef = ref(db, 'online/' + user);
  const lastSeenRef = ref(db, 'lastSeen/' + user);
  let timer: ReturnType<typeof setInterval> | null = null;
  let appStateSub: { remove: () => void } | null = null;

  const beat = () => {
    const ts = Date.now();
    set(onlineRef, { ts, device: 'mobile' }).catch(() => {});
    set(lastSeenRef, ts).catch(() => {});
  };

  const goOnline = () => {
    beat();
    onDisconnect(onlineRef).remove();
    onDisconnect(lastSeenRef).set(serverTimestamp());
    if (timer) clearInterval(timer);
    timer = setInterval(beat, HEARTBEAT_MS);
  };

  const goOffline = () => {
    if (timer) { clearInterval(timer); timer = null; }
    set(onlineRef, null).catch(() => {});
    set(lastSeenRef, Date.now()).catch(() => {});
  };

  const handleAppState = (state: AppStateStatus) => {
    if (state === 'active') goOnline();
    else goOffline();
  };

  goOnline();
  appStateSub = AppState.addEventListener('change', handleAppState);

  return () => {
    goOffline();
    if (appStateSub) appStateSub.remove();
  };
}

export function listenUserPresence(user: string, cb: (state: PresenceState) => void): () => void {
  const onlineRef = ref(db, 'online/' + user);
  const lastSeenRef = ref(db, 'lastSeen/' + user);

  let onlineTs: number | null = null;
  let lastSeen: number | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const emit = () => {
    const now = Date.now();
    const isOnline = onlineTs !== null && now - onlineTs < ONLINE_THRESHOLD_MS;
    cb({ online: isOnline, lastSeenTs: isOnline ? null : lastSeen });
  };

  const unsubOnline = onValue(onlineRef, (snap) => {
    const v = snap.val();
    onlineTs = v && typeof v.ts === 'number' ? v.ts : null;
    emit();
  });
  const unsubLastSeen = onValue(lastSeenRef, (snap) => {
    const v = snap.val();
    lastSeen = typeof v === 'number' ? v : null;
    emit();
  });

  intervalId = setInterval(emit, 20_000);

  return () => {
    off(onlineRef, 'value', unsubOnline);
    off(lastSeenRef, 'value', unsubLastSeen);
    if (intervalId) clearInterval(intervalId);
  };
}

const MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

export function formatLastSeen(ts: number | null): string {
  if (!ts) return 'был(а) давно';
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return 'был(а) только что';
  if (diff < 3600_000) {
    const m = Math.floor(diff / 60_000);
    return `был(а) ${m} мин назад`;
  }

  const d = new Date(ts);
  const nowD = new Date(now);
  const hm = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  const isToday = d.toDateString() === nowD.toDateString();
  if (isToday) return `был(а) сегодня в ${hm}`;
  const yesterday = new Date(nowD);
  yesterday.setDate(nowD.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `был(а) вчера в ${hm}`;
  return `был(а) ${d.getDate()} ${MONTHS[d.getMonth()]} в ${hm}`;
}
