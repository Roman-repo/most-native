import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  Animated, Easing, Dimensions, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { getProfile, updateProfile, setAvatar, removeAvatar, type Profile } from '../services/profiles';
import AvatarView from '../components/AvatarView';
import AvatarPicker from '../components/AvatarPicker';
import { IconBack } from '../components/Icons';

const { width: SCREEN_W } = Dimensions.get('window');

type Props = {
  user: string;
  onBack: () => void;
};

export default function ProfileEditScreen({ user, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const slideX = useRef(new Animated.Value(SCREEN_W)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [avatar, setAvatarLocal] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideX, { toValue: 0, duration: 320, easing: Easing.bezier(0.25, 0.1, 0.25, 1), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!user) return;
    getProfile(user).then((p: Profile | null) => {
      if (p) {
        setDisplayName(p.displayName || '');
        setStatus(p.status || '');
        setPhone(p.phone || '');
        setBirthday(p.birthday || '');
        setAvatarLocal(p.avatar || null);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  function close() {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.parallel([
      Animated.timing(slideX, { toValue: SCREEN_W, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onBack());
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await updateProfile(user, {
        displayName: displayName.trim(),
        status: status.trim(),
        phone: phone.trim(),
        birthday: birthday.trim(),
      });
      close();
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarPicked(dataUrl: string) {
    setAvatarLocal(dataUrl);
    try {
      await setAvatar(user, dataUrl);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message || 'Не удалось загрузить фото');
    }
  }

  async function handleAvatarRemove() {
    setAvatarLocal(null);
    try {
      await removeAvatar(user);
    } catch {}
  }

  return (
    <Animated.View style={[styles.root, { transform: [{ translateX: slideX }], opacity }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={close} style={styles.headerBtn} activeOpacity={0.6}>
            <IconBack size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Редактировать профиль</Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerSaveBtn} activeOpacity={0.7} disabled={saving || loading}>
            <Text style={[styles.headerSave, (saving || loading) && { opacity: 0.4 }]}>Готово</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarSection}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setPickerOpen(true)} style={styles.avatarWrap}>
              <AvatarView user={user} size={120} avatarOverride={avatar} fontSize={48} />
              <View style={styles.avatarCamBadge}>
                <Text style={styles.avatarCamIcon}>📷</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Нажмите, чтобы сменить фото</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Имя пользователя</Text>
            <View style={styles.readonlyRow}>
              <Text style={styles.readonlyText}>@{user}</Text>
            </View>
            <Text style={styles.hint}>Нельзя изменить</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Отображаемое имя</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={user}
              placeholderTextColor={theme.text3}
              maxLength={40}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Статус</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              value={status}
              onChangeText={setStatus}
              placeholder="Пара слов о себе"
              placeholderTextColor={theme.text3}
              multiline
              maxLength={120}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Телефон</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+7 900 000 00 00"
              placeholderTextColor={theme.text3}
              keyboardType="phone-pad"
              maxLength={32}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>День рождения</Text>
            <TextInput
              style={styles.input}
              value={birthday}
              onChangeText={setBirthday}
              placeholder="ДД.ММ.ГГГГ"
              placeholderTextColor={theme.text3}
              maxLength={10}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AvatarPicker
        visible={pickerOpen}
        hasAvatar={!!avatar}
        onClose={() => setPickerOpen(false)}
        onPicked={handleAvatarPicked}
        onRemove={handleAvatarRemove}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: theme.bg,
    zIndex: 40,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: theme.border,
    gap: 8,
  },
  headerBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: theme.text },
  headerSaveBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  headerSave: { color: theme.accent, fontSize: 16, fontWeight: '600' },

  avatarSection: { alignItems: 'center', paddingTop: 28, paddingBottom: 18 },
  avatarWrap: { position: 'relative' },
  avatarCamBadge: {
    position: 'absolute', right: -2, bottom: -2,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.accent,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: theme.bg,
  },
  avatarCamIcon: { fontSize: 16 },
  avatarHint: { fontSize: 13, color: theme.text3, marginTop: 12 },

  section: { paddingHorizontal: 20, paddingTop: 18 },
  label: {
    fontSize: 12, color: theme.text2, textTransform: 'uppercase',
    letterSpacing: 0.5, fontWeight: '600', marginBottom: 8,
  },
  input: {
    backgroundColor: theme.bg3,
    color: theme.text,
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1, borderColor: theme.border,
  },
  readonlyRow: {
    backgroundColor: theme.bg3,
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: theme.border,
  },
  readonlyText: { color: theme.text2, fontSize: 15 },
  hint: { fontSize: 12, color: theme.text3, marginTop: 6, marginLeft: 4 },
});
