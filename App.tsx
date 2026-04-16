import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { db } from './src/services/firebase';
import { ref, get } from 'firebase/database';

export default function App() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [chatCount, setChatCount] = useState(0);

  useEffect(() => {
    get(ref(db, 'chats'))
      .then((snap) => {
        const count = snap.exists() ? Object.keys(snap.val()).length : 0;
        setChatCount(count);
        setStatus('ok');
      })
      .catch(() => setStatus('error'));
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
      {status === 'ok' && (
        <Text style={styles.ok}>✅ Подключено к Firebase, чатов в базе: {chatCount}</Text>
      )}
      {status === 'error' && (
        <Text style={styles.err}>❌ Ошибка подключения к Firebase</Text>
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
