import { ref, onValue, off, set, remove, onDisconnect, serverTimestamp } from 'firebase/database';
import { db } from './firebase';

const DEBOUNCE_MS = 2_000;
const THRESHOLD_MS = 5_000;
const AUTO_STOP_MS = 4_000;

const lastBeat: Record<string, number> = {};
const autoStopTimers: Record<string, ReturnType<typeof setTimeout>> = {};

function key(chatId: string, user: string) {
  return chatId + '|' + user;
}

export function setTyping(chatId: string, user: string): void {
  if (!chatId || !user) return;
  const k = key(chatId, user);
  const now = Date.now();
  const last = lastBeat[k] || 0;

  if (autoStopTimers[k]) clearTimeout(autoStopTimers[k]);
  autoStopTimers[k] = setTimeout(() => stopTyping(chatId, user), AUTO_STOP_MS);

  if (now - last < DEBOUNCE_MS) return;
  lastBeat[k] = now;

  const r = ref(db, 'typing/' + chatId + '/' + user);
  set(r, serverTimestamp()).catch(() => {});
  onDisconnect(r).remove();
}

export function stopTyping(chatId: string, user: string): void {
  if (!chatId || !user) return;
  const k = key(chatId, user);
  lastBeat[k] = 0;
  if (autoStopTimers[k]) { clearTimeout(autoStopTimers[k]); delete autoStopTimers[k]; }
  const r = ref(db, 'typing/' + chatId + '/' + user);
  remove(r).catch(() => {});
}

export function listenTyping(
  chatId: string,
  meUser: string,
  cb: (typers: string[]) => void
): () => void {
  const r = ref(db, 'typing/' + chatId);
  let latest: Record<string, number> = {};
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const emit = () => {
    const now = Date.now();
    const active = Object.keys(latest).filter(
      (u) => u !== meUser && typeof latest[u] === 'number' && now - latest[u] < THRESHOLD_MS
    );
    cb(active);
  };

  const unsub = onValue(r, (snap) => {
    const v = snap.val() || {};
    latest = {};
    Object.keys(v).forEach((u) => {
      if (typeof v[u] === 'number') latest[u] = v[u];
    });
    emit();
  });

  intervalId = setInterval(emit, 2_000);

  return () => {
    off(r, 'value', unsub);
    if (intervalId) clearInterval(intervalId);
  };
}

export function formatTypingText(typers: string[], isGroup: boolean): string {
  if (typers.length === 0) return '';
  if (!isGroup || typers.length === 1) return typers[0] + ' печатает...';
  if (typers.length === 2) return typers.join(', ') + ' печатают...';
  return typers.slice(0, 2).join(', ') + ' и др. печатают...';
}
