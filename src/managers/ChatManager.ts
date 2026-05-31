import { db } from '../services/firebase';
import { ref, push, update, onValue, query, limitToLast, serverTimestamp, get } from 'firebase/database';

export type Message = {
  _key: string;
  sender: string;
  text?: string;
  image?: string;
  audio?: string;
  audioDur?: string;
  vidMsg?: string;
  vidDur?: string;
  sticker?: string;
  animSticker?: string;
  file?: string;
  fileName?: string;
  fileSize?: string;
  contactName?: string;
  contactPhone?: string;
  ts: number;
  replyTo?: { sender: string; text: string };
  reactions?: Record<string, { user: string; emoji: string }>;
  edited?: boolean;
  forwarded?: string;
  system?: boolean;
  callDir?: 'in' | 'out';
  callDur?: string;
  callVideo?: boolean;
  missed?: boolean;
};

export type PinInfo = { key: string; text: string; sender: string };

export function listenMessages(
  chatId: string,
  callback: (messages: Message[]) => void,
  limit: number = 50,
): () => void {
  const q = query(ref(db, 'messages/' + chatId), limitToLast(limit));
  // onValue returns an Unsubscribe function in modular SDK — use it directly.
  // off(q, 'value', handler) does NOT match the wrapped observer the SDK registers,
  // so it silently fails to unsubscribe → listener leaks on every pageSize change.
  const unsubscribe = onValue(q, (snap) => {
    const data = snap.val() || {};
    const keys = Object.keys(data);
    const msgs: Message[] = keys.map((k) => ({ _key: k, ...data[k] }));
    msgs.sort((a, b) => (a.ts || 0) - (b.ts || 0));
    const firstTs = msgs[0]?.ts ?? 0;
    const lastTs = msgs[msgs.length - 1]?.ts ?? 0;
    console.log('[FB] onValue chat=', chatId, 'limit=', limit, 'returned=', keys.length, 'firstTs=', firstTs, 'lastTs=', lastTs);
    callback(msgs);
  });
  return unsubscribe;
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

export async function sendImage(
  chatId: string,
  sender: string,
  imageUrl: string,
): Promise<void> {
  await push(ref(db, 'messages/' + chatId), { sender, image: imageUrl, ts: serverTimestamp() });
  await update(ref(db, 'chats/' + chatId), { lastText: '📷 Фото', lastTs: serverTimestamp() });
}

export async function sendAudio(
  chatId: string,
  sender: string,
  audioUrl: string,
  duration: number,
): Promise<void> {
  const d = Math.round(duration);
  const audioDur = `${Math.floor(d / 60)}:${String(d % 60).padStart(2, '0')}`;
  await push(ref(db, 'messages/' + chatId), { sender, audio: audioUrl, audioDur, ts: serverTimestamp() });
  await update(ref(db, 'chats/' + chatId), { lastText: '🎤 Голосовое', lastTs: serverTimestamp() });
}

export async function sendVideoMsg(
  chatId: string,
  sender: string,
  vidMsg: string,
  duration: number,
): Promise<void> {
  const d = Math.round(duration);
  const vidDur = `${Math.floor(d / 60)}:${String(d % 60).padStart(2, '0')}`;
  await push(ref(db, 'messages/' + chatId), { sender, vidMsg, vidDur, ts: serverTimestamp() });
  await update(ref(db, 'chats/' + chatId), { lastText: '🎥 Видео', lastTs: serverTimestamp() });
}

export async function sendFile(
  chatId: string,
  sender: string,
  file: string,
  fileName: string,
  fileSize: string,
): Promise<void> {
  await push(ref(db, 'messages/' + chatId), { sender, file, fileName, fileSize, ts: serverTimestamp() });
  await update(ref(db, 'chats/' + chatId), { lastText: '📄 Файл', lastTs: serverTimestamp() });
}

export async function sendContact(
  chatId: string,
  sender: string,
  contactName: string,
  contactPhone: string,
): Promise<void> {
  await push(ref(db, 'messages/' + chatId), { sender, contactName, contactPhone, ts: serverTimestamp() });
  await update(ref(db, 'chats/' + chatId), { lastText: '👤 ' + contactName, lastTs: serverTimestamp() });
}

export async function sendSticker(
  chatId: string,
  sender: string,
  sticker: string,
): Promise<void> {
  await push(ref(db, 'messages/' + chatId), { sender, sticker, ts: serverTimestamp() });
  await update(ref(db, 'chats/' + chatId), { lastText: sticker, lastTs: serverTimestamp() });
}

export async function sendAnimSticker(
  chatId: string,
  sender: string,
  animSticker: string,
): Promise<void> {
  await push(ref(db, 'messages/' + chatId), { sender, animSticker, ts: serverTimestamp() });
  await update(ref(db, 'chats/' + chatId), { lastText: '✨ Стикер', lastTs: serverTimestamp() });
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
  const unsubscribe = onValue(r, async (snap) => {
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
  return unsubscribe;
}

export async function editMessage(
  chatId: string,
  msgKey: string,
  newText: string,
): Promise<void> {
  const t = newText.trim();
  if (!t) return;
  await update(ref(db, `messages/${chatId}/${msgKey}`), { text: t, edited: true });
  // Обновляем lastText если редактируем последнее сообщение
  const lastSnap = await get(query(ref(db, 'messages/' + chatId), limitToLast(1)));
  const lastData = lastSnap.val() || {};
  const lastKey = Object.keys(lastData)[0];
  if (lastKey === msgKey) {
    await update(ref(db, 'chats/' + chatId), { lastText: t });
  }
}

export async function deleteMessage(chatId: string, msgKey: string): Promise<void> {
  const { remove } = await import('firebase/database');
  await remove(ref(db, `messages/${chatId}/${msgKey}`));
}

export async function forwardMessage(
  chatId: string,
  sender: string,
  original: Message,
): Promise<void> {
  const payload: any = { sender, ts: serverTimestamp(), forwarded: original.sender };
  let preview = '';
  if (original.text) { payload.text = original.text; preview = original.text; }
  else if (original.image) { payload.image = original.image; preview = '📷 Фото'; }
  else if (original.audio) { payload.audio = original.audio; payload.audioDur = original.audioDur; preview = '🎤 Голосовое'; }
  else if (original.vidMsg) { payload.vidMsg = original.vidMsg; payload.vidDur = original.vidDur; preview = '🎥 Видео'; }
  else if (original.sticker) { payload.sticker = original.sticker; preview = original.sticker; }
  else if (original.animSticker) { payload.animSticker = original.animSticker; preview = '✨ Стикер'; }
  else if (original.file) { payload.file = original.file; payload.fileName = original.fileName; payload.fileSize = original.fileSize; preview = '📄 Файл'; }
  else if (original.contactName) { payload.contactName = original.contactName; payload.contactPhone = original.contactPhone; preview = '👤 ' + original.contactName; }
  await push(ref(db, 'messages/' + chatId), payload);
  await update(ref(db, 'chats/' + chatId), { lastText: preview, lastTs: serverTimestamp() });
}

export async function togglePin(chatId: string, msgKey: string): Promise<void> {
  const { get: getVal, remove, set } = await import('firebase/database');
  const r = ref(db, `chats/${chatId}/pinnedMsgs/${msgKey}`);
  const snap = await getVal(r);
  if (snap.val()) await remove(r);
  else await set(r, true);
}
