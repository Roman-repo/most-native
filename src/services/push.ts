import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, update, remove } from 'firebase/database';
import { db } from './firebase';
import { sendMessage } from '../managers/ChatManager';

const PUSH_TOKEN_KEY = 'expo_push_token';

let notificationSubscription: Notifications.Subscription | null = null;
let responseSubscription: Notifications.Subscription | null = null;
let tokenSubscription: Notifications.Subscription | null = null;

export type PushNavigateFn = (chatId: string, chatName: string, isGroup: boolean) => void;

/**
 * Initialize push notifications for a logged-in user.
 * Call this once after login / app startup with valid session.
 */
export async function initPushNotifications(user: string, navigateToChat: PushNavigateFn) {
  // 1. Permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('[Push] Notification permission denied');
    return;
  }

  // 2. Foreground handler — show alert + sound + badge
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // 3. Register / update push token
  await registerPushToken(user);

  // 4. Listen for token changes
  tokenSubscription?.remove();
  tokenSubscription = Notifications.addPushTokenListener(async (newToken) => {
    console.log('[Push] Token refreshed:', newToken.data);
    await savePushToken(user, newToken.data);
  });

  // 5. Handle notification tap (background / killed → opened)
  responseSubscription?.remove();
  responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, any>;
    const chatId = data?.chatId as string | undefined;
    const chatName = data?.chatName as string | undefined;
    const isGroup = data?.isGroup === true;

    if (response.actionIdentifier === 'reply') {
      const userText = response.userText;
      if (userText && chatId) {
        sendMessage(chatId, user, userText).catch(console.error);
      }
      return;
    }

    if (chatId && chatName) {
      navigateToChat(chatId, chatName, isGroup);
    }
  });

  // 6. Check if app was opened from a notification (killed state)
  const lastNotification = await Notifications.getLastNotificationResponseAsync();
  if (lastNotification) {
    const data = lastNotification.notification.request.content.data as Record<string, any>;
    const chatId = data?.chatId as string | undefined;
    const chatName = data?.chatName as string | undefined;
    const isGroup = data?.isGroup === true;
    if (chatId && chatName) {
      navigateToChat(chatId, chatName, isGroup);
    }
  }

  // 7. Quick-reply category
  await Notifications.setNotificationCategoryAsync('message', [
    {
      identifier: 'reply',
      buttonTitle: 'Ответить',
      textInput: {
        submitButtonTitle: 'Отправить',
        placeholder: 'Сообщение...',
      },
      options: {
        opensAppToForeground: false,
      },
    },
  ]);

  console.log('[Push] Initialized for user', user);
}

/**
 * Clean up push listeners and remove token from RTDB on logout.
 */
export async function cleanupPushNotifications(user: string) {
  notificationSubscription?.remove();
  responseSubscription?.remove();
  tokenSubscription?.remove();
  notificationSubscription = null;
  responseSubscription = null;
  tokenSubscription = null;

  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (token) {
    try {
      await remove(ref(db, `users/${user}/pushTokens/${token.replace(/\./g, '_')}`));
    } catch (e) {
      console.log('[Push] Failed to remove token from RTDB:', e);
    }
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  }
}

/* ───── internal helpers ───── */

async function registerPushToken(user: string) {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '4460cb6f-65a4-4548-8ae3-58daaa7bbaf6',
    });
    const token = tokenData.data;
    console.log('[Push] Expo push token:', token);
    await savePushToken(user, token);
  } catch (e) {
    console.log('[Push] Failed to get push token:', e);
  }
}

async function savePushToken(user: string, token: string) {
  const oldToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (oldToken && oldToken !== token) {
    // Remove old token from RTDB
    try {
      await remove(ref(db, `users/${user}/pushTokens/${oldToken.replace(/\./g, '_')}`));
    } catch (e) {
      // ignore
    }
  }
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  // Dots are not allowed in Firebase keys
  const safeToken = token.replace(/\./g, '_');
  await update(ref(db, `users/${user}/pushTokens`), { [safeToken]: true });
}
