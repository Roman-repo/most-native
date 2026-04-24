import { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { listenProfile } from '../services/profiles';

const AVATAR_COLORS = ['#E85D75','#6C5CE7','#00B894','#FDCB6E','#E17055','#0984E3','#A29BFE','#55EFC4'];
export function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

type Props = {
  user: string;
  size: number;
  style?: ViewStyle | ViewStyle[];
  fontSize?: number;
  avatarOverride?: string | null;
};

export default function AvatarView({ user, size, style, fontSize, avatarOverride }: Props) {
  const [avatar, setAvatar] = useState<string | null>(avatarOverride ?? null);

  useEffect(() => {
    if (avatarOverride !== undefined) { setAvatar(avatarOverride ?? null); return; }
    if (!user) return;
    return listenProfile(user, (p) => setAvatar(p?.avatar || null));
  }, [user, avatarOverride]);

  const radius = size / 2;
  const letter = (user || '?').charAt(0).toUpperCase();
  const fs = fontSize ?? Math.max(12, Math.round(size * 0.42));

  if (avatar && avatar.length > 0) {
    return (
      <Image
        source={{ uri: avatar }}
        style={[{ width: size, height: size, borderRadius: radius }, style as any]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: radius, backgroundColor: avatarColor(user || '?') },
        style as any,
      ]}
    >
      <Text style={[styles.letter, { fontSize: fs }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  letter: { color: '#fff', fontWeight: '700' },
});
