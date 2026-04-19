import AsyncStorage from '@react-native-async-storage/async-storage';

export type ChatTheme = {
  id: string;
  name: string;
  emoji: string;
  acc: string;
  acc2: string;
  bubbleGrad: [string, string];
};

export const CHAT_THEMES: ChatTheme[] = [
  { id: 'nature',   name: 'Природа',   emoji: '🐥', acc: '#5cb85c', acc2: '#2d7a2d', bubbleGrad: ['#6ab04c', '#1e6838'] },
  { id: 'winter',   name: 'Зима',      emoji: '⛄', acc: '#3ec9d6', acc2: '#1a8a9a', bubbleGrad: ['#1a7a8a', '#38bcc8'] },
  { id: 'summer',   name: 'Лето',      emoji: '💎', acc: '#b06cc8', acc2: '#7b2fa0', bubbleGrad: ['#6858c8', '#9868c8'] },
  { id: 'science',  name: 'Наука',     emoji: '🤓', acc: '#2db5a0', acc2: '#167a6a', bubbleGrad: ['#3a8878', '#60a898'] },
  { id: 'romance',  name: 'Романтика', emoji: '🌷', acc: '#f09070', acc2: '#e8446a', bubbleGrad: ['#e8884a', '#d05898'] },
  { id: 'love',     name: 'Любовь',    emoji: '💜', acc: '#c888e0', acc2: '#8840b0', bubbleGrad: ['#b088d0', '#8858b8'] },
  { id: 'holiday',  name: 'Праздник',  emoji: '🎄', acc: '#e8a050', acc2: '#c06020', bubbleGrad: ['#b87828', '#a88038'] },
  { id: 'gamer',    name: 'Геймер',    emoji: '🎮', acc: '#e070a0', acc2: '#5080d0', bubbleGrad: ['#e89050', '#8868d0'] },
];

const key = (chatId: string) => `ct_${chatId}`;

export async function getChatTheme(chatId: string): Promise<ChatTheme | null> {
  try {
    const val = await AsyncStorage.getItem(key(chatId));
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

export async function setChatTheme(chatId: string, theme: ChatTheme | null): Promise<void> {
  if (theme) await AsyncStorage.setItem(key(chatId), JSON.stringify(theme));
  else await AsyncStorage.removeItem(key(chatId));
}
