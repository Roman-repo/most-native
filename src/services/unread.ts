import { ref, onValue, off, query, limitToLast } from 'firebase/database';
import { db } from './firebase';

/**
 * Считает непрочитанные сообщения в чате для пользователя.
 * Слушает /readReceipts/<chatId>/<user> + последние 50 сообщений /messages/<chatId>.
 * Непрочитано = кол-во сообщений, где sender !== user && ts > myReadTs.
 * 50 последних покрывает практически все реальные кейсы (счётчик рендерится как "50+" если упёрлось).
 */
export function listenUnread(
  chatId: string,
  user: string,
  cb: (count: number, capped: boolean) => void,
): () => void {
  let myReadTs = 0;
  let lastMessages: Array<{ sender: string; ts: number }> = [];
  let capped = false;

  const emit = () => {
    const count = lastMessages.reduce((acc, m) => {
      if (m.sender !== user && typeof m.ts === 'number' && m.ts > myReadTs) return acc + 1;
      return acc;
    }, 0);
    cb(count, capped && count >= 50);
  };

  const rReceipt = ref(db, 'readReceipts/' + chatId + '/' + user);
  const unsubReceipt = onValue(rReceipt, (snap) => {
    const v = snap.val();
    myReadTs = typeof v === 'number' ? v : 0;
    emit();
  });

  const rMsgs = query(ref(db, 'messages/' + chatId), limitToLast(50));
  const unsubMsgs = onValue(rMsgs, (snap) => {
    const v = snap.val() || {};
    const keys = Object.keys(v);
    capped = keys.length >= 50;
    lastMessages = keys.map((k) => ({
      sender: v[k]?.sender || '',
      ts: typeof v[k]?.ts === 'number' ? v[k].ts : 0,
    }));
    emit();
  });

  return () => {
    off(rReceipt, 'value', unsubReceipt);
    off(rMsgs, 'value', unsubMsgs);
  };
}
