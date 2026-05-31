import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';

function ChatItemSkeleton() {
  return (
    <View style={styles.item}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={styles.info}>
        <View style={styles.row}>
          <Skeleton width={140} height={16} borderRadius={8} />
          <Skeleton width={40} height={12} borderRadius={6} />
        </View>
        <View style={styles.row}>
          <Skeleton width={200} height={14} borderRadius={7} />
          <Skeleton width={22} height={22} borderRadius={11} />
        </View>
      </View>
    </View>
  );
}

export default function ChatListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }, (_, i) => (
        <ChatItemSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
