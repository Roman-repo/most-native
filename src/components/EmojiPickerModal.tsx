import { useState, useCallback, useEffect, memo } from 'react';
import {
  View, Text, TouchableOpacity, Modal, TextInput,
  StyleSheet, Dimensions, FlatList, Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../styles/theme';
import { EMOJIS } from '../utils/emoji';

const { width: SW, height: SH } = Dimensions.get('window');
const CATS = Object.keys(EMOJIS);
const RECENT_KEY = '@emoji_recent';
const MAX_RECENT = 16;

/* ---------- types ---------- */
type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
};

/* ---------- sub-components ---------- */
const EmojiCell = memo(({ item, onPress }: { item: string; onPress: (e: string) => void }) => (
  <TouchableOpacity style={styles.cell} onPress={() => onPress(item)}>
    <Text style={styles.emoji}>{item}</Text>
  </TouchableOpacity>
));

/* ---------- main ---------- */
export default function EmojiPickerModal({ visible, onClose, onSelect }: Props) {
  const [cat, setCat] = useState(0);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [keyboardH, setKeyboardH] = useState(0);

  /* load recent */
  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem(RECENT_KEY).then((raw) => {
      if (raw) setRecent(JSON.parse(raw));
    });
  }, [visible]);

  /* keyboard height for layout */
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (e) => setKeyboardH(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardH(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const saveRecent = useCallback(async (emoji: string) => {
    const next = [emoji, ...recent.filter((e) => e !== emoji)].slice(0, MAX_RECENT);
    setRecent(next);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
  }, [recent]);

  const handleSelect = useCallback((emoji: string) => {
    saveRecent(emoji);
    onSelect(emoji);
    onClose();
  }, [saveRecent, onSelect, onClose]);

  /* search results */
  const searchResults = query.trim()
    ? CATS.flatMap((c) => EMOJIS[c]).filter((e) => e.includes(query.trim()))
    : [];

  const data = query.trim()
    ? searchResults
    : EMOJIS[CATS[cat]];

  const renderItem = useCallback(({ item }: { item: string }) => (
    <EmojiCell item={item} onPress={handleSelect} />
  ), [handleSelect]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: Math.max(16, keyboardH) }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Реакция</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchWrap}>
            <TextInput
              style={styles.searchInput}
              placeholder="Поиск эмодзи..."
              placeholderTextColor={theme.text2}
              value={query}
              onChangeText={setQuery}
              autoFocus={false}
            />
          </View>

          {/* Recent */}
          {!query.trim() && recent.length > 0 && (
            <View style={styles.recentWrap}>
              <Text style={styles.sectionLabel}>Недавние</Text>
              <FlatList
                data={recent}
                keyExtractor={(e) => `recent_${e}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.recentCell} onPress={() => handleSelect(item)}>
                    <Text style={styles.recentEmoji}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* Categories */}
          {!query.trim() && (
            <View style={styles.catRow}>
              {CATS.map((c, i) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.catBtn, cat === i && styles.catBtnActive]}
                  onPress={() => setCat(i)}
                >
                  <Text style={styles.catBtnText}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Grid */}
          <FlatList
            data={data}
            keyExtractor={(e, i) => `${query.trim() ? 'search' : CATS[cat]}_${e}_${i}`}
            numColumns={8}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            initialNumToRender={32}
            maxToRenderPerBatch={32}
            windowSize={5}
            contentContainerStyle={styles.gridContent}
            ListEmptyComponent={
              query.trim() ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>Ничего не найдено</Text>
                </View>
              ) : null
            }
          />
        </View>
      </View>
    </Modal>
  );
}

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: '#0f0c29',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 12,
    maxHeight: SH * 0.72,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  title: { fontSize: 17, fontWeight: '700', color: theme.text },
  closeBtn: { fontSize: 20, color: theme.text2, padding: 4 },

  searchWrap: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchInput: {
    fontSize: 16,
    color: theme.text,
    padding: 0,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text2,
    marginBottom: 6,
    paddingHorizontal: 4,
  },

  recentWrap: {
    marginBottom: 10,
  },
  recentCell: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentEmoji: { fontSize: 26 },

  catRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    gap: 4,
  },
  catBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  catBtnActive: {
    backgroundColor: 'rgba(102,126,234,0.25)',
  },
  catBtnText: { fontSize: 20 },

  gridContent: { paddingVertical: 4 },
  cell: {
    width: SW / 8,
    height: SW / 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },

  empty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: theme.text2,
  },
});
