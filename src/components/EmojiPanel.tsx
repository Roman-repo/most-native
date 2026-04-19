import { useState, useCallback, memo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Dimensions, FlatList,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { theme } from '../styles/theme';
import { EMOJIS, STICKERS, ANIM_STICKERS } from '../utils/emoji';

const { width: SW } = Dimensions.get('window');
const CATS = Object.keys(EMOJIS);

type Tab = 'emoji' | 'sticker' | 'anim';

type Props = {
  onEmoji: (emoji: string) => void;
  onSticker: (sticker: string) => void;
  onAnimSticker: (id: string) => void;
};

// Мемоизированные ячейки — не перерисовываются без изменений пропсов
const EmojiCell = memo(({ item, onPress }: { item: string; onPress: (e: string) => void }) => (
  <TouchableOpacity style={styles.emojiCell} onPress={() => onPress(item)}>
    <Text style={styles.emojiItem}>{item}</Text>
  </TouchableOpacity>
));

const StickerCell = memo(({ item, onPress }: { item: string; onPress: (s: string) => void }) => (
  <TouchableOpacity style={styles.stickerCell} onPress={() => onPress(item)}>
    <Text style={styles.stickerItem}>{item}</Text>
  </TouchableOpacity>
));

const AnimCell = memo(({ item, onPress }: { item: typeof ANIM_STICKERS[0]; onPress: (id: string) => void }) => (
  <TouchableOpacity style={styles.animCell} onPress={() => onPress(item.id)}>
    <SvgXml xml={item.svg} width={60} height={60} />
    <Text style={styles.animName}>{item.name}</Text>
  </TouchableOpacity>
));

export default function EmojiPanel({ onEmoji, onSticker, onAnimSticker }: Props) {
  const [tab, setTab] = useState<Tab>('emoji');
  const [cat, setCat] = useState(0);

  const renderEmoji = useCallback(({ item }: { item: string }) => (
    <EmojiCell item={item} onPress={onEmoji} />
  ), [onEmoji]);

  const renderSticker = useCallback(({ item }: { item: string }) => (
    <StickerCell item={item} onPress={onSticker} />
  ), [onSticker]);

  const renderAnim = useCallback(({ item }: { item: typeof ANIM_STICKERS[0] }) => (
    <AnimCell item={item} onPress={onAnimSticker} />
  ), [onAnimSticker]);

  return (
    <View style={styles.panel}>
      {/* Вкладки */}
      <View style={styles.tabs}>
        {(['emoji', 'sticker', 'anim'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'emoji' ? '😊 Эмодзи' : t === 'sticker' ? '🎨 Стикеры' : '✨ Живые'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Эмодзи */}
      {tab === 'emoji' && (
        <View style={styles.emojiWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow} contentContainerStyle={styles.catRowContent}>
            {CATS.map((c, i) => (
              <TouchableOpacity key={c} style={[styles.catBtn, cat === i && styles.catBtnActive]} onPress={() => setCat(i)}>
                <Text style={styles.catBtnText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <FlatList
            data={EMOJIS[CATS[cat]]}
            keyExtractor={(e) => e}
            numColumns={8}
            style={styles.grid}
            contentContainerStyle={styles.gridContent}
            renderItem={renderEmoji}
            removeClippedSubviews
            initialNumToRender={24}
            maxToRenderPerBatch={24}
            windowSize={3}
          />
        </View>
      )}

      {/* Стикеры */}
      {tab === 'sticker' && (
        <FlatList
          data={STICKERS}
          keyExtractor={(e) => e}
          numColumns={6}
          style={styles.grid}
          contentContainerStyle={styles.gridContent}
          renderItem={renderSticker}
          removeClippedSubviews
          initialNumToRender={18}
        />
      )}

      {/* Живые */}
      {tab === 'anim' && (
        <FlatList
          data={ANIM_STICKERS}
          keyExtractor={(s) => s.id}
          numColumns={4}
          style={styles.grid}
          contentContainerStyle={styles.gridContent}
          renderItem={renderAnim}
          removeClippedSubviews
          initialNumToRender={12}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: '#0f0c29',
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: theme.accent },
  tabText: { fontSize: 13, color: theme.text2, fontWeight: '500' },
  tabTextActive: { color: theme.accent },

  emojiWrap: { flex: 1 },
  catRow: { maxHeight: 44, flexGrow: 0 },
  catRowContent: { paddingHorizontal: 8, paddingVertical: 6, gap: 4, alignItems: 'center' },
  catBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  catBtnActive: { backgroundColor: 'rgba(102,126,234,0.25)' },
  catBtnText: { fontSize: 20 },

  grid: { flex: 1 },
  gridContent: { padding: 4 },

  emojiCell: { width: SW / 8, height: SW / 8, alignItems: 'center', justifyContent: 'center' },
  emojiItem: { fontSize: 26 },

  stickerCell: { width: SW / 6, height: SW / 6, alignItems: 'center', justifyContent: 'center' },
  stickerItem: { fontSize: 38 },

  animCell: { width: SW / 4, height: SW / 4, alignItems: 'center', justifyContent: 'center', gap: 2 },
  animName: { fontSize: 10, color: theme.text2, textAlign: 'center' },
});
