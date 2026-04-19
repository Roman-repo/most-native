import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';
import { logout } from '../services/auth';

type Props = {
  user: string;
  onLogout: () => void;
  onClose: () => void;
};

export default function DrawerContent({ user, onLogout, onClose }: Props) {
  async function handleLogout() {
    await logout();
    onLogout();
  }

  return (
    <View style={styles.container}>
      {/* Аватар и имя */}
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.userName}>{user}</Text>
        <Text style={styles.userStatus}>В сети</Text>
      </View>

      {/* Меню */}
      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem} onPress={onClose}>
          <Text style={styles.menuIcon}>💬</Text>
          <Text style={styles.menuText}>Чаты</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>⚙️</Text>
          <Text style={styles.menuText}>Настройки</Text>
        </TouchableOpacity>
      </View>

      {/* Выход */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Выйти</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg2,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  profile: {
    alignItems: 'center',
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    marginBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 30, color: '#fff', fontWeight: 'bold' },
  userName: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 4 },
  userStatus: { fontSize: 13, color: theme.green },
  menu: { flex: 1 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  menuIcon: { fontSize: 20, marginRight: 14 },
  menuText: { fontSize: 16, color: theme.text },
  logoutBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.border,
    marginBottom: 20,
  },
  logoutText: { color: theme.red, fontSize: 16, fontWeight: '600' },
});
