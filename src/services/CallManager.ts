// CallManager — порт web-source/modules/CallManager.js на React Native
// WebRTC + Firebase signaling. Аудио (v4.8.0) + видео (v4.10.0).

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

export type CameraFacing = 'user' | 'environment';

export type CallSnapshot = {
  state: CallState;
  peer: string | null;
  role: CallRole | null;
  durationSec: number;
  muted: boolean;
  speaker: boolean;
  callId: string | null;
  video: boolean;                  // это видеозвонок?
  cameraOn: boolean;               // моя камера включена (в активном видеозвонке может быть выключена)
  remoteVideoOn: boolean;          // камера пира активна (track не muted)
  cameraFacing: CameraFacing;      // фронтальная или тыльная
  swapped: boolean;                // PIP и fullscreen поменяны местами
  localStreamURL: string | null;   // streamURL для RTCView
  remoteStreamURL: string | null;
};

type Listener = (s: CallSnapshot) => void;

let pc: RTCPeerConnection | null = null;
let stream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;
let callId: string | null = null;
let role: CallRole | null = null;
let peer: string | null = null;
let me: string = '';
let state: CallState = 'idle';
let muted = false;
let speaker = true;
let durationSec = 0;
let video = false;
let cameraOn = true;
let remoteVideoOn = true;
let cameraFacing: CameraFacing = 'user';
let swapped = false;
let timerInt: ReturnType<typeof setInterval> | null = null;
let globalListenerStarted = false;
const listeners = new Set<Listener>();

function snapshot(): CallSnapshot {
  return {
    state, peer, role, durationSec, muted, speaker, callId,
    video, cameraOn, remoteVideoOn, cameraFacing, swapped,
    localStreamURL: stream ? (stream as any).toURL() : null,
    remoteStreamURL: remoteStream ? (remoteStream as any).toURL() : null,
  };
}

function emit() {
  const snap = snapshot();
  listeners.forEach((l) => l(snap));
}

export function subscribeCall(l: Listener): () => void {
  listeners.add(l);
  l(snapshot());
  return () => { listeners.delete(l); };
}

export function getCallSnapshot(): CallSnapshot {
  return snapshot();
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
    // Сохраняем remote stream для RTCView и отслеживаем состояние камеры пира.
    const rs: MediaStream | undefined = e.streams && e.streams[0];
    if (rs) {
      remoteStream = rs;
      // Если среди треков есть видео — слушаем его mute/unmute для remoteVideoOn
      const vt = rs.getVideoTracks && rs.getVideoTracks()[0];
      if (vt) {
        remoteVideoOn = !vt.muted;
        // @ts-ignore — поля mute/unmute у MediaStreamTrack через addEventListener
        vt.addEventListener('mute', () => { remoteVideoOn = false; emit(); });
        // @ts-ignore
        vt.addEventListener('unmute', () => { remoteVideoOn = true; emit(); });
      }
      emit();
    }
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

async function getMediaStream(withVideo: boolean, facing: CameraFacing = 'user'): Promise<MediaStream> {
  const constraints: any = { audio: true };
  if (withVideo) {
    constraints.video = { facingMode: facing, width: 320, height: 240 };
  } else {
    constraints.video = false;
  }
  // @ts-ignore — react-native-webrtc returns MediaStream
  return await mediaDevices.getUserMedia(constraints);
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
      if (d.to === me && d.from !== me && d.status === 'ringing') {
        if (callId === child.key) return; // уже обрабатываем этот входящий
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
  video = !!data.video;
  speaker = video; // видеозвонок — громкая связь
  cameraOn = video;
  remoteVideoOn = true;
  cameraFacing = 'user';
  swapped = false;
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

export async function startCall(target: string, withVideo: boolean = false) {
  if (state !== 'idle') return;
  if (!me) throw new Error('CallManager not initialized');
  if (target === me) throw new Error('Нельзя позвонить самому себе');

  state = 'outgoing';
  peer = target;
  role = 'caller';
  muted = false;
  speaker = withVideo; // видеозвонок по умолчанию на громкой связи
  durationSec = 0;
  video = withVideo;
  cameraOn = withVideo;
  remoteVideoOn = true;
  cameraFacing = 'user';
  swapped = false;
  callId = `${me}__to__${target}__${Date.now()}`;
  emit();

  try {
    InCallManager.start({ media: withVideo ? 'video' : 'audio' });
    InCallManager.setForceSpeakerphoneOn(withVideo);
    playRingbackTone();

    stream = await getMediaStream(withVideo, cameraFacing);
    await setupPC(stream);
    emit(); // обновить localStreamURL

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
      video: withVideo,
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
    InCallManager.start({ media: video ? 'video' : 'audio' });
    InCallManager.setForceSpeakerphoneOn(video);

    stream = await getMediaStream(video, cameraFacing);
    await setupPC(stream);
    emit();

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
  let extra: any = { callVideo: video };
  if (durationSec > 0) {
    const m = Math.floor(durationSec / 60);
    const s = durationSec % 60;
    const dur = m > 0 ? `${m}:${s < 10 ? '0' : ''}${s}` : `0:${s < 10 ? '0' : ''}${s}`;
    const prefix = role === 'caller' ? 'Исходящий' : 'Входящий';
    text = video ? `${prefix} видеовызов ${dur}` : `${prefix} звонок ${dur}`;
    extra = { ...extra, callDir: role === 'caller' ? 'out' : 'in', callDur: dur };
  } else if (role === 'callee') {
    text = video ? 'Пропущенный видеовызов' : 'Пропущенный вызов';
    extra = { ...extra, callDir: 'in', missed: true };
  } else if (role === 'caller') {
    if (reason === 'declined') text = video ? 'Отклонённый видеовызов' : 'Отклонённый вызов';
    else if (reason === 'busy') text = 'Абонент занят';
    else if (reason === 'noanswer') text = 'Нет ответа';
    else text = video ? 'Отменённый видеовызов' : 'Отменённый вызов';
    extra = { ...extra, callDir: 'out' };
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
  remoteStream = null;
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
  video = false;
  cameraOn = true;
  remoteVideoOn = true;
  cameraFacing = 'user';
  swapped = false;
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

// — Видео: вкл/выкл локальной камеры —
export function toggleCamera() {
  if (!stream || !video) return;
  cameraOn = !cameraOn;
  stream.getVideoTracks().forEach((t) => { t.enabled = cameraOn; });
  emit();
}

// — Видео: переключение фронтальная ↔ тыльная —
// Специфичный API react-native-webrtc: track._switchCamera() переключает на месте.
export function flipCamera() {
  if (!stream || !video) return;
  const vt = stream.getVideoTracks()[0];
  if (!vt) return;
  try {
    // @ts-ignore — _switchCamera есть у react-native-webrtc MediaStreamTrack
    if (typeof vt._switchCamera === 'function') {
      // @ts-ignore
      vt._switchCamera();
      cameraFacing = cameraFacing === 'user' ? 'environment' : 'user';
      emit();
    }
  } catch {}
}

// — Видео: swap PIP ↔ fullscreen —
export function swapVideos() {
  if (!video || state !== 'active') return;
  swapped = !swapped;
  emit();
}
