import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { db } from './src/services/firebase';
import { ref, get } from 'firebase/database';

type Status = 'loading' | 'connected' | 'auth_required' | 'error';

export default function App() {
  const [status, setStatus] = useState<Status>('loading');
  const [chatCount, setChatCount] = useState(0);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    get(ref(db, 'chats'))
      .then((snap) => {
        const count = snap.exists() ? Object.keys(snap.val()).length : 0;
        setChatCount(count);
        setStatus('connected');
      })
      .catch((e: any) => {
        const msg = (e?.message ?? e?.code ?? String(e)).toLowerCase();
        // PERMISSION_DENIED = Firebase работает, просто правила требуют авторизацию
        if (msg.includes('permission')) {
          setStatus('auth_required');
        } else {
          setErrMsg(e?.message ?? String(e));
          setStatus('error');
        }
      });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Привет, Мост! 👋</Text>

      {status === 'loading' && (
        <>
          <ActivityIndicator color="#6C5CE7" style={{ marginTop: 16 }} />
          <Text style={styles.sub}>Подключаюсь к Firebase...</Text>
        </>
      )}

      {status === 'connected' && (
        <Text style={styles.ok}>✅ Firebase подключён, чатов в базе: {chatCount}</Text>
      )}

      {status === 'auth_required' && (
        <Text style={styles.ok}>✅ Firebase подключён (авторизация требуется — это нормально)</Text>
      )}

      {status === 'error' && (
        <Text style={styles.err}>❌ Ошибка сети: {errMsg}</Text>
      )}

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  sub: {
    marginTop: 8,
    color: '#aaa',
    fontSize: 14,
  },
  ok: {
    marginTop: 16,
    color: '#00B894',
    fontSize: 16,
    textAlign: 'center',
  },
  err: {
    marginTop: 16,
    color: '#E85D75',
    fontSize: 16,
    textAlign: 'center',
  },
});
