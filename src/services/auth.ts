import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';
import { ref, get, set } from 'firebase/database';
import CryptoJS from 'crypto-js';

const SALT = '_pulse_2026';

export async function hashPassword(password: string): Promise<string> {
  return CryptoJS.SHA256(password + SALT).toString();
}

export async function register(name: string, password: string): Promise<void> {
  const snap = await get(ref(db, 'accounts/' + name));
  if (snap.exists()) throw new Error('Имя занято');
  const hash = await hashPassword(password);
  await set(ref(db, 'accounts/' + name), { hash });
  await set(ref(db, 'profiles/' + name), { name, status: '', avatar: '' });
  await AsyncStorage.setItem('pc_user', name);
  await AsyncStorage.setItem('pc_hash', hash);
}

export async function login(name: string, password: string): Promise<void> {
  const snap = await get(ref(db, 'accounts/' + name));
  const account = snap.val();
  if (!account) throw new Error('Аккаунт не найден');
  const hash = await hashPassword(password);
  if (hash !== account.hash) throw new Error('Неверный пароль');
  await AsyncStorage.setItem('pc_user', name);
  await AsyncStorage.setItem('pc_hash', hash);
}

export async function getSession(): Promise<{ user: string; hash: string } | null> {
  const user = await AsyncStorage.getItem('pc_user');
  const hash = await AsyncStorage.getItem('pc_hash');
  if (!user || !hash) return null;
  // Проверяем что сессия ещё валидна
  const snap = await get(ref(db, 'accounts/' + user));
  const account = snap.val();
  if (!account || account.hash !== hash) return null;
  return { user, hash };
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem('pc_user');
  await AsyncStorage.removeItem('pc_hash');
}
