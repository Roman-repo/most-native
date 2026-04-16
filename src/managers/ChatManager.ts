import { db } from '../services/firebase';
import { ref, push, update, onValue, off, query, limitToLast, serverTimestamp, get } from 'firebase/database';

export type Message = {
  _key: string;
  sender: string;
  text?: string;
  image?: string;
  audio?: string;
  audioDur?: string;
  ts: number;
  replyTo?: { sender: string; text: string };
  reactions?: Record<string, { user: string; emoji: string }>;
  edited?: boolean;
  system?: boolean;
};

export type PinInfo = { key: string; text: string; sender: string };

export function listenMessages(
  chatId: string,
  callback: (messages: Message[]) => void,
): () => void {
  const q = query(ref(db, 'messages/' + chatId), limitToLast(200));
  const handler = onValue(q, (snap) => {
    const data = snap.val() || {};
    const msgs: Message[] = Object.keys(data).map((k) => ({ _key: k, ...data[k] }));
    msgs.sort((a, b) => (a.ts || 0) - (b.ts || 0));
    callback(msgs);
  });
  return () => off(q, 'value', handler);
}

export async function sendMessage(
  chatId: string,
  sender: string,
  text: string,
  replyTo?: { sender: string; text: string },
): Promise<void> {
  const msg: any = { sender, text: text.trim(), ts: serverTimestamp() };
  if (replyTo) msg.replyTo = replyTo;
  await push(ref(db, 'messages/' + chatId), msg);
  await update(ref(db, 'chats/' + chatId), {
    lastText: text.trim(),
    lastTs: serverTimestamp(),
  });
}

export async function toggleReaction(
  chatId: string,
  msgKey: string,
  user: string,
  emoji: string,
): Promise<void> {
  const reactRef = ref(db, `messages/${chatId}/${msgKey}/reactions`);
  const snap = await get(reactRef);
  const data: Record<string, { user: string; emoji: string }> = snap.val() || {};
  const existingKey = Object.keys(data).find(
    (k) => data[k].user === user && data[k].emoji === emoji,
  );
  if (existingKey) {
    await update(ref(db, `messages/${chatId}/${msgKey}/reactions/${existingKey}`), {});
    // Firebase doesn't have delete in modular SDK without remove — use set null trick
    const { remove } = await import('firebase/database');
    await remove(ref(db, `messages/${chatId}/${msgKey}/reactions/${existingKey}`));
  } else {
    await push(reactRef, { user, emoji });
  }
}

export function listenPins(
  chatId: string,
  callback: (pins: PinInfo[]) => void,
): () => void {
  const r = ref(db, 'chats/' + chatId + '/pinnedMsgs');
  const handler = onValue(r, async (snap) => {
    const pins = snap.val() || {};
    const keys = Object.keys(pins);
    if (!keys.length) { callback([]); return; }
    // Get message texts for pinned keys
    const msgsSnap = await get(ref(db, 'messages/' + chatId));
    const msgsData = msgsSnap.val() || {};
    const pinInfos: PinInfo[] = keys
      .filter((k) => msgsData[k])
      .map((k) => ({
        key: k,
        text: msgsData[k].text || '📷',
        sender: msgsData[k].sender || '',
      }));
    callback(pinInfos);
  });
  return () => off(r, 'value', handler);
}

export async function togglePin(chatId: string, msgKey: string): Promise<void> {
  const { get: getVal, remove, set } = await import('firebase/database');
  const r = ref(db, `chats/${chatId}/pinnedMsgs/${msgKey}`);
  const snap = await getVal(r);
  if (snap.val()) await remove(r);
  else await set(r, true);
}
