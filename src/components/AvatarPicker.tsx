import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../styles/theme';

type Props = {
  visible: boolean;
  hasAvatar: boolean;
  onClose: () => void;
  onPicked: (dataUrl: string) => void;
  onRemove: () => void;
};

const PICKER_OPTS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
  base64: true,
};

function toDataUrl(res: ImagePicker.ImagePickerSuccessResult): string | null {
  const a = res.assets?.[0];
  if (!a || !a.base64) return null;
  const mime = a.mimeType || 'image/jpeg';
  return `data:${mime};base64,${a.base64}`;
}

export default function AvatarPicker({ visible, hasAvatar, onClose, onPicked, onRemove }: Props) {
  async function takeSelfie() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Нет доступа', 'Разреши доступ к камере в настройках');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      ...PICKER_OPTS,
      cameraType: ImagePicker.CameraType.front,
    });
    if (res.canceled) return;
    const url = toDataUrl(res);
    if (url) { onPicked(url); onClose(); }
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Нет доступа', 'Разреши доступ к галерее в настройках');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync(PICKER_OPTS);
    if (res.canceled) return;
    const url = toDataUrl(res);
    if (url) { onPicked(url); onClose(); }
  }

  function handleRemove() {
    onRemove();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <Text style={styles.title}>Фото профиля</Text>

          <TouchableOpacity style={styles.row} onPress={takeSelfie} activeOpacity={0.7}>
            <Text style={styles.icon}>📷</Text>
            <Text style={styles.rowText}>Сделать селфи</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={pickFromGallery} activeOpacity={0.7}>
            <Text style={styles.icon}>🖼</Text>
            <Text style={styles.rowText}>Выбрать из галереи</Text>
          </TouchableOpacity>

          {hasAvatar && (
            <TouchableOpacity style={styles.row} onPress={handleRemove} activeOpacity={0.7}>
              <Text style={styles.icon}>🗑</Text>
              <Text style={[styles.rowText, { color: theme.red }]}>Удалить фото</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Отмена</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.bg2solid,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 14,
    paddingBottom: 30,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 13, color: theme.text2, textTransform: 'uppercase',
    letterSpacing: 0.5, fontWeight: '600',
    textAlign: 'center', paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: theme.border, marginBottom: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, gap: 14 },
  icon: { fontSize: 22 },
  rowText: { fontSize: 16, color: theme.text },
  cancel: {
    marginTop: 8, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: theme.border,
    alignItems: 'center',
  },
  cancelText: { fontSize: 16, color: theme.accent, fontWeight: '600' },
});
