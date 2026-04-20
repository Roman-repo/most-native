// CallManager — порт web-source/modules/CallManager.js на React Native
// WebRTC + Firebase signaling. Только аудио (видео — v4.9.0).

import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';
import { db } from './firebase';
import {
  ref, set, update, push, get, onValue, off,
  query, orderByChild, startAt, serverTimestamp,
} from 'firebase/database';
import { playRingtone, stopRingtone, playRingbackTone, stopRingbackTone } from './ringtones';

const ICE = {
  iceServers: [
    { urls: 'stun:stun.relay.metered.ca:80' },
    { urls: 'turn:na.relay.metered.ca:80', username: '1d2b3f3f051f33e72d9655c5', credential: 'soU8Zg9EfNQiLU+p' },
    { urls: 'turn:na.relay.metered.ca:80?transport=tcp', username: '1d2b3f3f051f33e72d9655c5', credential: 'soU8Zg9EfNQiLU+p' },
    { urls: 'turn:na.relay.metered.ca:443', username: '1d2b3f3f051f33e72d9655c5', credential: 'soU8Zg9EfNQiLU+p' },
    { urls: 'turns:na.relay.metered.ca:443?transport=tcp', username: '1d2b3f3f051f33e72d9655c5', credential: 'soU8Zg9EfNQiLU+p' },
  ],
};

export type CallRole = 'caller' | 'callee';
export type CallState = 'idle' | 'outgoing' | 'incoming' | 'active';

export type CallSnapshot = {
  state: CallState;
  peer: string | null;
  role: CallRole | null;
  durationSec: number;
  muted: boolean;
  speaker: boolean;
  callId: string | null;
};

type Listener = (s: CallSnapshot) => void;

let pc: RTCPeerConnection | null = null;
let stream: MediaStream | null = null;
let callId: string | null = null;
let role: CallRole | null = null;
let peer: string | null = null;
let me: string = '';
let state: CallState = 'idle';
let muted = false;
let speaker = true;
let durationSec = 0;
let timerInt: ReturnType<typeof setInterval> | null = null;
let globalListenerStarted = false;
const listeners = new Set<Listener>();

function emit() {
  const snap: CallSnapshot = { state, peer, role, durationSec, muted, speaker, callId };
  listeners.forEach((l) => l(snap));
}

export function subscribeCall(l: Listener): () => void {
  listeners.add(l);
  l({ state, peer, role, durationSec, muted, speaker, callId });
  return () => { listeners.delete(l); };
}

export function getCallSnapshot(): CallSnapshot {
  return { state, peer, role, durationSec, muted, speaker, callId };
}

function gci(a: string, b: string): string {
  return [a, b].sort().join('__');
}

function startTimer() {
  if (timerInt) return;
  durationSec = 0;
  timerInt = setInterval(() => { durationSec++; emit(); }, 1000);
}

function stopTimer() {
  if (timerInt) { clearInterval(timerInt); timerInt = null; }
}

async function setupPC(s: MediaStream) {
  pc = new RTCPeerConnection(ICE);
  s.getTracks().forEach((t) => pc!.addTrack(t, s));

  // @ts-ignore (event types from react-native-webrtc)
  pc.addEventListener('track', (e: any) => {
    // На native attach аудио треков выполняется автоматически через peer connection,
    // InCallManager управляет аудио-маршрутом (speaker/earpiece).
  });

  // @ts-ignore
  pc.addEventListener('connectionstatechange', () => {
    const cs = (pc as any)?.connectionState;
    if (cs === 'failed' || cs === 'disconnected' || cs === 'closed') {
      if (state === 'active') {
        end({ reason: 'lost' });
      }
    }
  });
}

async function getMicStream(): Promise<MediaStream> {
  // @ts-ignore — react-native-webrtc returns MediaStream
  return await mediaDevices.getUserMedia({ audio: true, video: false });
}

export function init(currentUser: string) {
  me = currentUser;
  startGlobalListener();
}

function startGlobalListener() {
  if (globalListenerStarted || !me) return;
  globalListenerStarted = true;

  const callsRef = query(ref(db, 'calls'), orderByChild('ts'), startAt(Date.now()));
  onValue(callsRef, (snap) => {
    snap.forEach((child) => {
      const d = child.val();
      if (!d) return;
      if (d.to === me && d.status === 'ringing') {
        if (state !== 'idle') {
          // BUSY: автоматически отклоняем как "вторая линия"
          update(ref(db, 'calls/' + child.key), { status: 'busy' }).catch(() => {});
          return;
        }
        handleIncoming(child.key as string, d);
      }
    });
  });
}

function handleIncoming(cid: string, data: any) {
  if (state !== 'idle') return;
  state = 'incoming';
  callId = cid;
  peer = data.from;
  role = 'callee';
  muted = false;
  speaker = true;
  durationSec = 0;
  emit();
  playRingtone(data.from);
  // Слушаем отмену со стороны звонящего
  const cRef = ref(db, 'calls/' + cid + '/status');
  onValue(cRef, (s) => {
    const v = s.val();
    if (v === 'cancelled' || v === 'ended') {
      stopRingtone();
      cleanup({ writeChat: true, reason: 'missed' });
    }
  });
}

export async function startCall(target: string) {
  if (state !== 'idle') return;
  if (!me) throw new Error('CallManager not initialized');

  state = 'outgoing';
  peer = target;
  role = 'caller';
  muted = false;
  speaker = true;
  durationSec = 0;
  callId = `${me}__to__${target}__${Date.now()}`;
  emit();

  try {
    InCallManager.start({ media: 'audio' });
    InCallManager.setForceSpeakerphoneOn(false);
    playRingbackTone();

    stream = await getMicStream();
    await setupPC(stream);

    const cRef = ref(db, 'calls/' + callId);

    // @ts-ignore
    pc!.addEventListener('icecandidate', (e: any) => {
      if (e.candidate && callId) {
        push(ref(db, 'calls/' + callId + '/callerIce'), e.candidate.toJSON());
      }
    });

    // @ts-ignore
    const offer = await pc!.createOffer({});
    await pc!.setLocalDescription(offer);

    await set(cRef, {
      from: me,
      to: target,
      offer: { type: offer.type, sdp: offer.sdp },
      status: 'ringing',
      video: false,
      ts: serverTimestamp(),
    });

    // Слушаем answer
    onValue(ref(db, 'calls/' + callId + '/answer'), (s) => {
      const a = s.val();
      if (a && pc && (pc as any).signalingState !== 'closed') {
        pc.setRemoteDescription(new RTCSessionDescription(a))
          .then(() => {
            stopRingbackTone();
            state = 'active';
            startTimer();
            emit();
          }).catch(() => {});
      }
    });

    // Слушаем ICE callee
    onValue(ref(db, 'calls/' + callId + '/calleeIce'), (s) => {
      s.forEach((child) => {
        const c = child.val();
        if (c && pc && (pc as any).signalingState !== 'closed') {
          pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
      });
    });

    // Статус (для busy / declined)
    onValue(ref(db, 'calls/' + callId + '/status'), (s) => {
      const v = s.val();
      if (v === 'declined') {
        stopRingbackTone();
        cleanup({ writeChat: true, reason: 'declined' });
      } else if (v === 'busy') {
        stopRingbackTone();
        cleanup({ writeChat: true, reason: 'busy' });
      } else if (v === 'ended') {
        cleanup({ writeChat: true, reason: 'ended' });
      }
    });

    // Таймаут 60 сек если не ответили
    setTimeout(() => {
      if (state === 'outgoing') {
        end({ reason: 'noanswer' });
      }
    }, 60000);
  } catch (err) {
    cleanup({ writeChat: false });
    throw err;
  }
}

export async function acceptCall() {
  if (state !== 'incoming' || !callId) return;
  stopRingtone();
  try {
    InCallManager.start({ media: 'audio' });
    InCallManager.setForceSpeakerphoneOn(false);

    stream = await getMicStream();
    await setupPC(stream);

    // @ts-ignore
    pc!.addEventListener('icecandidate', (e: any) => {
      if (e.candidate && callId) {
        push(ref(db, 'calls/' + callId + '/calleeIce'), e.candidate.toJSON());
      }
    });

    const snap = await get(ref(db, 'calls/' + callId));
    const data = snap.val();
    if (!data || !data.offer) return;

    await pc!.setRemoteDescription(new RTCSessionDescription(data.offer));
    // @ts-ignore
    const answer = await pc!.createAnswer({});
    await pc!.setLocalDescription(answer);

    await set(ref(db, 'calls/' + callId + '/answer'), {
      type: answer.type, sdp: answer.sdp,
    });
    await update(ref(db, 'calls/' + callId), { status: 'active' });

    // Слушаем ICE caller
    onValue(ref(db, 'calls/' + callId + '/callerIce'), (s) => {
      s.forEach((child) => {
        const c = child.val();
        if (c && pc && (pc as any).signalingState !== 'closed') {
          pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
      });
    });

    state = 'active';
    startTimer();
    emit();
  } catch (err) {
    cleanup({ writeChat: false });
  }
}

export async function declineCall() {
  if (state !== 'incoming' || !callId) return;
  stopRingtone();
  await update(ref(db, 'calls/' + callId), { status: 'declined' }).catch(() => {});
  cleanup({ writeChat: true, reason: 'declined-by-me' });
}

export async function end(opts?: { reason?: string }) {
  const reason = opts?.reason;
  if (callId && role) {
    if (role === 'callee') {
      await update(ref(db, 'calls/' + callId), { status: 'declined' }).catch(() => {});
    } else {
      const newStatus = state === 'active' ? 'ended' : 'cancelled';
      await update(ref(db, 'calls/' + callId), { status: newStatus }).catch(() => {});
    }
  }
  cleanup({ writeChat: true, reason });
}

async function writeChatHistory(reason?: string) {
  if (!peer || !me) return;
  const cid = gci(me, peer);
  let text = '';
  let extra: any = {};
  if (durationSec > 0) {
    const m = Math.floor(durationSec / 60);
    const s = durationSec % 60;
    const dur = m > 0 ? `${m}:${s < 10 ? '0' : ''}${s}` : `0:${s < 10 ? '0' : ''}${s}`;
    text = `${role === 'caller' ? 'Исходящий' : 'Входящий'} звонок ${dur}`;
    extra = { callDir: role === 'caller' ? 'out' : 'in', callDur: dur };
  } else if (role === 'callee') {
    text = 'Пропущенный вызов';
    extra = { callDir: 'in', missed: true };
  } else if (role === 'caller') {
    if (reason === 'declined') text = 'Отклонённый вызов';
    else if (reason === 'busy') text = 'Абонент занят';
    else if (reason === 'noanswer') text = 'Нет ответа';
    else text = 'Отменённый вызов';
    extra = { callDir: 'out' };
  }
  if (!text) return;
  try {
    await push(ref(db, 'messages/' + cid), {
      system: true,
      text,
      ts: serverTimestamp(),
      ...extra,
    });
    await update(ref(db, 'chats/' + cid), { lastText: text, lastTs: serverTimestamp() });
  } catch {}
}

function cleanup(opts: { writeChat: boolean; reason?: string }) {
  stopRingtone();
  stopRingbackTone();
  stopTimer();
  if (opts.writeChat) writeChatHistory(opts.reason);
  if (pc) { try { pc.close(); } catch {} pc = null; }
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
  if (callId) {
    off(ref(db, 'calls/' + callId + '/answer'));
    off(ref(db, 'calls/' + callId + '/callerIce'));
    off(ref(db, 'calls/' + callId + '/calleeIce'));
    off(ref(db, 'calls/' + callId + '/status'));
  }
  try { InCallManager.stop(); } catch {}
  callId = null;
  peer = null;
  role = null;
  state = 'idle';
  muted = false;
  speaker = true;
  durationSec = 0;
  emit();
}

export function toggleMute() {
  if (!stream) return;
  muted = !muted;
  stream.getAudioTracks().forEach((t) => { t.enabled = !muted; });
  emit();
}

export function toggleSpeaker() {
  speaker = !speaker;
  try { InCallManager.setForceSpeakerphoneOn(speaker); } catch {}
  emit();
}
