import { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, StyleSheet, Dimensions, View } from 'react-native';
import type { Message } from '../managers/ChatManager';

const { width: W, height: H } = Dimensions.get('window');

export const FX_LIST = [
  { name: '🎉 Конфетти', words: ['🎉','поздравляю','congrats'], key: 'confetti' },
  { name: '❤️ Сердечки', words: ['❤️','люблю','love','целую'], key: 'hearts' },
  { name: '🎈 Шарики', words: ['🎂','с днём рождения','happy birthday'], key: 'balloons' },
  { name: '❄️ Снежинки', words: ['🎄','❄️','с новым годом','happy new year'], key: 'snow' },
  { name: '🐱 Котики', words: ['мяу','кото'], key: 'cats' },
  { name: '🌸 Сакура', words: ['весна','красиво','beautiful','🌸'], key: 'sakura' },
  { name: '⚡ Молнии', words: ['шок','ого','wow','OMG','⚡'], key: 'lightning' },
  { name: '🎵 Ноты', words: ['музыка','песня','music','🎵'], key: 'notes' },
  { name: '💰 Монеты', words: ['деньги','зарплата','money','💰'], key: 'coins' },
] as const;

export type FxKey = typeof FX_LIST[number]['key'];

const FX_RULES: { key: FxKey; test: (t: string) => boolean }[] = [
  { key: 'confetti', test: (t) => /🎉|поздравл|побед|ура|congrats|хурра/i.test(t) },
  { key: 'hearts', test: (t) => /❤️|люблю|love|целую|💕|💗/i.test(t) },
  { key: 'balloons', test: (t) => /🎂|с дн(ём|ем) рождения|happy birthday|🎈/i.test(t) },
  { key: 'snow', test: (t) => /❄️|🎄|с новым годом|happy new year|снег|зима/i.test(t) },
  { key: 'cats', test: (t) => /мяу|кото/i.test(t) },
  { key: 'sakura', test: (t) => /весна|красиво|beautiful|🌸/i.test(t) },
  { key: 'lightning', test: (t) => /шок|ого|wow|omg|⚡/i.test(t) },
  { key: 'notes', test: (t) => /музык|песн|music|🎵/i.test(t) },
  { key: 'coins', test: (t) => /деньг|зарплат|money|💰/i.test(t) },
];

const CONFETTI_COLORS = ['#E85D75','#6C5CE7','#00B894','#FDCB6E','#0984E3','#A29BFE','#55EFC4'];

function ConfettiEffect({ onDone }: { onDone: () => void }) {
  const anims = useRef(
    Array.from({ length: 50 }, () => ({
      y: new Animated.Value(-20),
      x: Math.random() * W,
      rot: new Animated.Value(0),
      opacity: new Animated.Value(1),
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 8 + Math.random() * 8,
      dur: 2000 + Math.random() * 1500,
      delay: Math.random() * 800,
    }))
  ).current;

  useEffect(() => {
    anims.forEach((a) =>
      Animated.sequence([
        Animated.delay(a.delay),
        Animated.parallel([
          Animated.timing(a.y, { toValue: H + 40, duration: a.dur, useNativeDriver: true }),
          Animated.timing(a.rot, { toValue: 720, duration: a.dur, useNativeDriver: true }),
          Animated.timing(a.opacity, { toValue: 0, duration: a.dur * 0.3, delay: a.dur * 0.7, useNativeDriver: true }),
        ]),
      ]).start()
    );
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: a.x,
            top: 0,
            width: a.size,
            height: a.size,
            backgroundColor: a.color,
            borderRadius: 2,
            opacity: a.opacity,
            transform: [
              { translateY: a.y },
              { rotate: a.rot.interpolate({ inputRange: [0, 720], outputRange: ['0deg', '720deg'] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

function EmojiRainEffect({
  emojis,
  count,
  onDone,
  direction = 'up',
  withSway = false,
}: {
  emojis: string[];
  count: number;
  onDone: () => void;
  direction?: 'up' | 'down';
  withSway?: boolean;
}) {
  const anims = useRef(
    Array.from({ length: count }, () => ({
      y: new Animated.Value(direction === 'up' ? H + 20 : -20),
      x: Math.random() * W,
      scale: new Animated.Value(0.5 + Math.random() * 0.8),
      opacity: new Animated.Value(1),
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      size: 20 + Math.random() * 20,
      dur: 2000 + Math.random() * 1500,
      delay: Math.random() * 1000,
    }))
  ).current;

  useEffect(() => {
    anims.forEach((a) => {
      const animsList: Animated.CompositeAnimation[] = [
        Animated.delay(a.delay),
        Animated.parallel([
          Animated.timing(a.y, {
            toValue: direction === 'up' ? -H * 0.4 : H + 40,
            duration: a.dur,
            useNativeDriver: true,
          }),
          Animated.timing(a.opacity, {
            toValue: 0,
            duration: a.dur * 0.4,
            delay: a.dur * 0.6,
            useNativeDriver: true,
          }),
        ]),
      ];
      Animated.sequence(animsList).start();
    });
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map((a, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute',
            left: a.x,
            top: 0,
            fontSize: a.size,
            opacity: a.opacity,
            transform: [{ translateY: a.y }, { scale: a.scale }],
          }}
        >
          {a.emoji}
        </Animated.Text>
      ))}
    </View>
  );
}

function LightningEffect({ onDone }: { onDone: () => void }) {
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(255,255,200,0.15)',
          opacity: flash,
        }}
      />
      {Array.from({ length: 6 }).map((_, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute',
            left: Math.random() * W * 0.8 + W * 0.1,
            top: Math.random() * H * 0.3,
            fontSize: 30 + Math.random() * 20,
            opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
          }}
        >
          ⚡
        </Animated.Text>
      ))}
    </View>
  );
}

type Props = {
  messages: Message[];
  manualEffect?: FxKey | null;
  onManualDone?: () => void;
};

const seenKeys = new Set<string>();

export default function ChatEffects({ messages, manualEffect, onManualDone }: Props) {
  const [effect, setEffect] = useState<FxKey | null>(null);

  useEffect(() => {
    if (manualEffect) {
      setEffect(manualEffect);
      return;
    }
    if (!messages.length) return;
    const last = messages[messages.length - 1];
    if (!last || !last.text || !last._key) return;
    if (seenKeys.has(last._key)) return;
    if (Date.now() - (last.ts || 0) > 8000) return;
    const text = last.text.toLowerCase();
    for (const rule of FX_RULES) {
      if (rule.test(text)) {
        seenKeys.add(last._key);
        setEffect(rule.key);
        return;
      }
    }
  }, [messages, manualEffect]);

  const handleDone = useCallback(() => {
    setEffect(null);
    onManualDone?.();
  }, [onManualDone]);

  const key = manualEffect || effect;
  if (!key) return null;

  switch (key) {
    case 'confetti':
      return <ConfettiEffect onDone={handleDone} />;
    case 'hearts':
      return <EmojiRainEffect emojis={['❤️','💕','💗','💖','💝']} count={30} onDone={handleDone} direction="up" />;
    case 'balloons':
      return <EmojiRainEffect emojis={['🎈','🎊','🎁','🎂']} count={20} onDone={handleDone} direction="up" />;
    case 'snow':
      return <EmojiRainEffect emojis={['❄️','❄','✻','✼','❅','❆']} count={35} onDone={handleDone} direction="down" />;
    case 'cats':
      return <EmojiRainEffect emojis={['🐱','🐾','🐈','😺','😸']} count={25} onDone={handleDone} direction="up" />;
    case 'sakura':
      return <EmojiRainEffect emojis={['🌸','🌺','💮','🏵️','🌷']} count={30} onDone={handleDone} direction="down" />;
    case 'lightning':
      return <LightningEffect onDone={handleDone} />;
    case 'notes':
      return <EmojiRainEffect emojis={['🎵','🎶','🎼','♪','♫','🎤']} count={25} onDone={handleDone} direction="up" />;
    case 'coins':
      return <EmojiRainEffect emojis={['💰','💵','💴','💶','💷','🪙','💎']} count={30} onDone={handleDone} direction="down" />;
    default:
      return null;
  }
}
