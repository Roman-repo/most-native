import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { theme } from '../styles/theme';
import { login, register } from '../services/auth';

type Props = { onLogin: (user: string) => void };
type Mode = 'login' | 'register';

export default function LoginScreen({ onLogin }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = name.trim().length >= 2 && password.length >= 4 && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(name.trim(), password);
      } else {
        await register(name.trim(), password);
      }
      onLogin(name.trim());
    } catch (e: any) {
      setError(e.message ?? 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.logo}>🌉 Мост</Text>
        <Text style={styles.subtitle}>
          {mode === 'login' ? 'Войти в аккаунт' : 'Создать аккаунт'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Имя (от 2 символов)"
          placeholderTextColor={theme.text3}
          value={name}
          onChangeText={setName}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Пароль (от 4 символов)"
          placeholderTextColor={theme.text3}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          onSubmitEditing={handleSubmit}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, canSubmit && styles.btnActive]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>
                {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
              </Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
          <Text style={styles.switchText}>
            {mode === 'login' ? 'Нет аккаунта? Регистрация' : 'Есть аккаунт? Войти'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: theme.text2,
    marginBottom: 32,
  },
  input: {
    width: '100%',
    backgroundColor: theme.bg2,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: theme.text,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  error: {
    color: theme.red,
    marginBottom: 8,
    fontSize: 14,
  },
  btn: {
    width: '100%',
    backgroundColor: theme.bg3,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  btnActive: {
    backgroundColor: theme.accent,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchText: {
    color: theme.accent2,
    fontSize: 14,
  },
});
