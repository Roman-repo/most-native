import { db } from './firebase';
import { ref, get, update, onValue, off, set } from 'firebase/database';

export type Profile = {
  name?: string;
  displayName?: string;
  status?: string;
  avatar?: string;
  phone?: string;
  birthday?: string;
};

export async function getProfile(user: string): Promise<Profile | null> {
  const snap = await get(ref(db, 'profiles/' + user));
  return snap.val();
}

export async function updateProfile(user: string, fields: Partial<Profile>): Promise<void> {
  await update(ref(db, 'profiles/' + user), fields);
}

export async function setAvatar(user: string, dataUrl: string): Promise<void> {
  await set(ref(db, 'profiles/' + user + '/avatar'), dataUrl);
}

export async function removeAvatar(user: string): Promise<void> {
  await set(ref(db, 'profiles/' + user + '/avatar'), '');
}

export function listenProfile(user: string, cb: (p: Profile | null) => void): () => void {
  const r = ref(db, 'profiles/' + user);
  const handler = (s: any) => cb(s.val());
  onValue(r, handler);
  return () => off(r, 'value', handler);
}
