import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../styles/theme';
import { logout } from '../services/auth';
import { listenOnlineUsers } from '../services/presence';
import { listenProfile, type Profile } from '../services/profiles';
import AvatarView from '../components/AvatarView';
import { APP_VERSION_FULL } from '../version';

type Props = {
  user: string;
  onLogout: () => void;
  onClose: () => void;
  onOpenPrivate?: (otherUser: string) => void;
  onOpenProfileEdit?: () => void;
};

export default function DrawerContent({ user, onLogout, onClose, onOpenPrivate, onOpenProfileEdit }: Props) {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    return listenOnlineUsers(user, setOnlineUsers);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return listenProfile(user, setMyProfile);
  }, [user]);

  async function handleLogout() {
    await logout();
    onLogout();
  }

  function handleOpenPrivate(other: string) {
    onOpenPrivate?.(other);
    onClose();
  }

  function handleOpenProfile() {
    onOpenProfileEdit?.();
    onClose();
  }

  const displayName = myProfile?.displayName?.trim() || user;
  const subline = myProfile?.status?.trim() || 'В сети';

  return (
    <View style={styles.container}>
      {/* Аватар и имя */}
      <TouchableOpacity style={styles.profile} activeOpacity={0.7} onPress={handleOpenProfile}>
        <AvatarView user={user} size={72} avatarOverride={myProfile?.avatar || null} fontSize={30} style={{ marginBottom: 12 }} />
        <Text style={styles.userName}>{displayName}</Text>
        <Text style={styles.userStatus} numberOfLines={1}>{subline}</Text>
      </TouchableOpacity>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Меню */}
        <TouchableOpacity style={styles.menuItem} onPress={onClose}>
          <Text style={styles.menuIcon}>💬</Text>
          <Text style={styles.menuText}>Чаты</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleOpenProfile}>
          <Text style={styles.menuIcon}>👤</Text>
          <Text style={styles.menuText}>Мой профиль</Text>
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
              <View style={styles.userAvatarWrap}>
                <AvatarView user={u} size={36} fontSize={15} />
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
  userAvatarWrap: { position: 'relative' },
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
