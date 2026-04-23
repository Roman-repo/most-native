// Рингтоны — 5 встроенных mp3 + ringback для гудка ожидания.
// Привязка к конкретному юзеру через /userRingtones/{me}/{otherUser} в RTDB.

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { ref, get, set } from 'firebase/database';
import { db } from './firebase';

const BUILTIN: Record<string, number> = {
  ring1: require('../../assets/ringtones/ring1.mp3'),
  ring2: require('../../assets/ringtones/ring2.mp3'),
  ring3: require('../../assets/ringtones/ring3.mp3'),
  ring4: require('../../assets/ringtones/ring4.mp3'),
  ring5: require('../../assets/ringtones/ring5.mp3'),
};
const RINGBACK = require('../../assets/ringtones/ringback.mp3');

let me = '';
let ringPlayer: AudioPlayer | null = null;
let ringbackPlayer: AudioPlayer | null = null;
let audioModeSet = false;

export function setMeForRingtones(user: string) {
  me = user;
}

async function ensureAudioMode() {
  if (audioModeSet) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true });
    audioModeSet = true;
  } catch {}
}

async function resolveRingtoneSource(fromUser: string): Promise<number | { uri: string }> {
  if (me) {
    try {
      const snap = await get(ref(db, `userRingtones/${me}/${fromUser}`));
      const v = snap.val();
      if (typeof v === 'string') {
        if (v.startsWith('custom://')) return { uri: v.replace('custom://', '') };
        if (BUILTIN[v]) return BUILTIN[v];
      }
    } catch {}
  }
  return BUILTIN.ring1;
}

export async function playRingtone(fromUser: string) {
  stopRingtone();
  await ensureAudioMode();
  const src = await resolveRingtoneSource(fromUser);
  try {
    ringPlayer = createAudioPlayer(src as any);
    ringPlayer.loop = true;
    ringPlayer.volume = 1.0;
    ringPlayer.play();
  } catch (e) {
    console.warn('[ringtone] play failed', e);
  }
}

export function stopRingtone() {
  if (!ringPlayer) return;
  try { ringPlayer.pause(); } catch {}
  try { ringPlayer.remove(); } catch {}
  ringPlayer = null;
}

export async function playRingbackTone() {
  stopRingbackTone();
  await ensureAudioMode();
  try {
    ringbackPlayer = createAudioPlayer(RINGBACK);
    ringbackPlayer.loop = true;
    ringbackPlayer.volume = 0.6;
    ringbackPlayer.play();
  } catch (e) {
    console.warn('[ringback] play failed', e);
  }
}

export function stopRingbackTone() {
  if (!ringbackPlayer) return;
  try { ringbackPlayer.pause(); } catch {}
  try { ringbackPlayer.remove(); } catch {}
  ringbackPlayer = null;
}

export async function setUserRingtone(otherUser: string, ringtoneId: string) {
  if (!me) return;
  await set(ref(db, `userRingtones/${me}/${otherUser}`), ringtoneId);
}

export const RINGTONE_IDS = ['ring1', 'ring2', 'ring3', 'ring4', 'ring5'] as const;
