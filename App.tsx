import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getSession } from './src/services/auth';
import { startPresence } from './src/services/presence';
import { ref, get, set, serverTimestamp } from 'firebase/database';
import { db } from './src/services/firebase';
import LoginScreen from './src/screens/LoginScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatScreen from './src/screens/ChatScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import ProfileEditScreen from './src/screens/ProfileEditScreen';
import CallScreen from './src/screens/CallScreen';
import DrawerContent from './src/screens/DrawerContent';
import { init as initCallManager } from './src/services/CallManager';
import { setMeForRingtones } from './src/services/ringtones';
import { theme } from './src/styles/theme';

type Screen = 'login' | 'chatList' | 'chat';
type ChatInfo = { id: string; name: string; isGroup: boolean };

const DRAWER_WIDTH = Dimensions.get('window').width * 0.75;

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [user, setUser] = useState('');
  const [currentChat, setCurrentChat] = useState<ChatInfo | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileUser, setProfileUser] = useState<string | null>(null);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  // Автологин при запуске
  useEffect(() => {
    getSession()
      .then((session) => {
        if (session) {
          setUser(session.user);
          setScreen('chatList');
        }
      })
      .catch(() => {});
  }, []);

  // Presence: пока user залогинен — держим онлайн-статус
  useEffect(() => {
    if (!user) return;
    const stop = startPresence(user);
    return stop;
  }, [user]);

  // CallManager: init listener входящих звонков при логине
  useEffect(() => {
    if (!user) return;
    initCallManager(user);
    setMeForRingtones(user);
  }, [user]);

  function openDrawer() {
    setDrawerOpen(true);
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }

  function closeDrawer() {
    Animated.timing(drawerAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false));
  }

  function handleLogin(userName: string) {
    setUser(userName);
    setScreen('chatList');
  }

  function handleOpenChat(chatId: string, chatName: string, isGroup: boolean = false) {
    setCurrentChat({ id: chatId, name: chatName, isGroup });
    setScreen('chat');
  }

  function handleBackToList() {
    setScreen('chatList');
  }

  async function handleOpenPrivate(otherUser: string) {
    const cid = [user, otherUser].sort().join('__');
    const snap = await get(ref(db, 'chats/' + cid));
    if (!snap.val()) {
      await set(ref(db, 'chats/' + cid), {
        members: [user, otherUser],
        lastText: '',
        lastTs: serverTimestamp(),
      });
    }
    setCurrentChat({ id: cid, name: otherUser, isGroup: false });
    setScreen('chat');
  }

  function handleLogout() {
    setUser('');
    setCurrentChat(null);
    setDrawerOpen(false);
    setScreen('login');
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={styles.root}>
          <StatusBar style="light" />

          {screen === 'login' && (
            <LoginScreen onLogin={handleLogin} />
          )}

          {screen === 'chatList' && (
            <ChatListScreen
              user={user}
              onOpenChat={handleOpenChat}
              onOpenDrawer={openDrawer}
            />
          )}

          {screen === 'chat' && currentChat && (
            <ChatScreen
              chatId={currentChat.id}
              chatName={currentChat.name}
              user={user}
              isGroup={currentChat.isGroup}
              onBack={handleBackToList}
              onOpenPrivate={handleOpenPrivate}
              onOpenProfile={(otherUser) => setProfileUser(otherUser)}
            />
          )}

          {/* User profile overlay (slides in over ChatScreen) */}
          {screen === 'chat' && currentChat && profileUser && (
            <UserProfileScreen
              username={profileUser}
              chatId={currentChat.id}
              onBack={() => setProfileUser(null)}
            />
          )}

          {/* Drawer overlay */}
          {drawerOpen && (
            <TouchableOpacity
              style={styles.overlay}
              activeOpacity={1}
              onPress={closeDrawer}
            />
          )}

          {/* Drawer panel */}
          <Animated.View
            style={[styles.drawer, { width: DRAWER_WIDTH, transform: [{ translateX: drawerAnim }] }]}
          >
            <DrawerContent
              user={user}
              onLogout={handleLogout}
              onClose={closeDrawer}
              onOpenPrivate={handleOpenPrivate}
              onOpenProfileEdit={() => setProfileEditOpen(true)}
            />
          </Animated.View>

          {/* Profile edit overlay */}
          {user && profileEditOpen && (
            <ProfileEditScreen user={user} onBack={() => setProfileEditOpen(false)} />
          )}

          {/* Call overlay — поверх всего */}
          {user && <CallScreen />}
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  drawer: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    zIndex: 20,
  },
});
