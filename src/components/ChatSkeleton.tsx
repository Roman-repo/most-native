import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';

function BubbleMe() {
  return (
    <View style={[styles.row, styles.rowMe]}>
      <View style={[styles.bubble, styles.bubbleMe]}>
        <Skeleton width={180} height={14} borderRadius={7} />
        <Skeleton width={120} height={14} borderRadius={7} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

function BubbleOther() {
  return (
    <View style={[styles.row, styles.rowOther]}>
      <View style={[styles.bubble, styles.bubbleOther]}>
        <Skeleton width={160} height={14} borderRadius={7} />
        <Skeleton width={140} height={14} borderRadius={7} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

function ImageMe() {
  return (
    <View style={[styles.row, styles.rowMe]}>
      <Skeleton width={200} height={140} borderRadius={14} />
    </View>
  );
}

export default function ChatSkeleton() {
  return (
    <View style={styles.container}>
      <BubbleOther />
      <BubbleMe />
      <BubbleOther />
      <ImageMe />
      <BubbleMe />
      <BubbleOther />
      <BubbleMe />
      <BubbleOther />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  row: {
    maxWidth: '80%',
  },
  rowMe: {
    alignSelf: 'flex-end',
  },
  rowOther: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleMe: {
    backgroundColor: 'rgba(102,126,234,0.15)',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderBottomLeftRadius: 4,
  },
});
