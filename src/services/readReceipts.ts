import { ref, onValue, off, set, serverTimestamp } from 'firebase/database';
import { db } from './firebase';

/**
 * Пишет в /readReceipts/<chatId>/<user> текущий server-timestamp.
 * Вызывается при открытии чата и при каждом апдейте сообщений (чтобы новые тоже считались прочитанными).
 */
export function markRead(chatId: string, user: string): void {
  if (!chatId || !user) return;
  set(ref(db, 'readReceipts/' + chatId + '/' + user), serverTimestamp()).catch(() => {});
}

/**
 * Слушает /readReceipts/<chatId>, возвращает максимальный timestamp среди всех пользователей кроме себя.
 * Если хоть один другой участник прочитал сообщение (его ts >= msg.ts) → сообщение считается прочитанным.
 */
export function listenReadReceipts(
  chatId: string,
  meUser: string,
  cb: (maxOtherReadTs: number) => void,
): () => void {
  const r = ref(db, 'readReceipts/' + chatId);
  const unsub = onValue(r, (snap) => {
    const v = snap.val() || {};
    let max = 0;
    Object.keys(v).forEach((u) => {
      if (u === meUser) return;
      const t = v[u];
      if (typeof t === 'number' && t > max) max = t;
    });
    cb(max);
  });
  return () => off(r, 'value', unsub);
}
