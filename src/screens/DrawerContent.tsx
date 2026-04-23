import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../styles/theme';
import { logout } from '../services/auth';
import { listenOnlineUsers } from '../services/presence';
import { APP_VERSION_FULL } from '../version';

const AVATAR_COLORS = ['#E85D75','#6C5CE7','#00B894','#FDCB6E','#E17055','#0984E3','#A29BFE','#55EFC4'];
function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

type Props = {
  user: string;
  onLogout: () => void;
  onClose: () => void;
  onOpenPrivate?: (otherUser: string) => void;
};

export default function DrawerContent({ user, onLogout, onClose, onOpenPrivate }: Props) {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    return listenOnlineUsers(user, setOnlineUsers);
  }, [user]);

  async function handleLogout() {
    await logout();
    onLogout();
  }

  function handleOpenPrivate(other: string) {
    onOpenPrivate?.(other);
    onClose();
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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Меню */}
        <TouchableOpacity style={styles.menuItem} onPress={onClose}>
          <Text style={styles.menuIcon}>💬</Text>
          <Text style={styles.menuText}>Чаты</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>⚙️</Text>
          <Text style={styles.menuText}>Настройки</Text>
        </TouchableOpacity>

        {/* Онлайн пользователи */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Сейчас онлайн</Text>
          <View style={styles.onlineBadge}>
            <Text style={styles.onlineBadgeText}>{onlineUsers.length}</Text>
          </View>
        </View>

        {onlineUsers.length === 0 ? (
          <Text style={styles.emptyText}>Пока никого</Text>
        ) : (
          onlineUsers.map((u) => (
            <TouchableOpacity
              key={u}
              style={styles.userItem}
              activeOpacity={0.7}
              onPress={() => handleOpenPrivate(u)}
            >
              <View style={[styles.userAvatar, { backgroundColor: avatarColor(u) }]}>
                <Text style={styles.userAvatarText}>{u.charAt(0).toUpperCase()}</Text>
                <View style={styles.onlineDot} />
              </View>
              <Text style={styles.userItemName} numberOfLines={1}>{u}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Выход */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Выйти</Text>
      </TouchableOpacity>

      {/* Версия приложения */}
      <Text style={styles.versionText}>Мост {APP_VERSION_FULL}</Text>
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
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    marginBottom: 16,
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  menuIcon: { fontSize: 20, marginRight: 14 },
  menuText: { fontSize: 16, color: theme.text },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 8,
    gap: 8,
  },
  sectionTitle: { fontSize: 12, color: theme.text2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  onlineBadge: {
    backgroundColor: 'rgba(0,184,148,0.18)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  onlineBadgeText: { color: theme.green, fontSize: 11, fontWeight: '700' },
  emptyText: { color: theme.text3, fontSize: 13, paddingHorizontal: 8, paddingVertical: 6 },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 12,
  },
  userAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  userAvatarText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  onlineDot: {
    position: 'absolute', right: -1, bottom: -1,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: theme.green,
    borderWidth: 2, borderColor: theme.bg2solid,
  },
  userItemName: { fontSize: 15, color: theme.text, flex: 1 },
  logoutBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  logoutText: { color: theme.red, fontSize: 16, fontWeight: '600' },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: theme.text3,
    paddingBottom: 16,
    paddingTop: 4,
  },
});
