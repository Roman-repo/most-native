import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';

export default function ProfileSkeleton() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Skeleton width={36} height={36} borderRadius={18} />
        <Skeleton width={100} height={18} borderRadius={9} />
        <Skeleton width={36} height={36} borderRadius={18} />
      </View>

      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <Skeleton width={120} height={120} borderRadius={60} />
        <Skeleton width={160} height={22} borderRadius={11} style={{ marginTop: 14 }} />
        <Skeleton width={80} height={14} borderRadius={7} style={{ marginTop: 6 }} />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Skeleton width={80} height={60} borderRadius={12} />
        <Skeleton width={80} height={60} borderRadius={12} />
        <Skeleton width={80} height={60} borderRadius={12} />
      </View>

      {/* Info row */}
      <View style={styles.infoRow}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.infoBody}>
          <Skeleton width={140} height={16} borderRadius={8} />
          <Skeleton width={100} height={12} borderRadius={6} style={{ marginTop: 4 }} />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Skeleton width={60} height={28} borderRadius={14} />
        <Skeleton width={60} height={28} borderRadius={14} />
        <Skeleton width={60} height={28} borderRadius={14} />
        <Skeleton width={60} height={28} borderRadius={14} />
        <Skeleton width={60} height={28} borderRadius={14} />
      </View>

      {/* Grid placeholders */}
      <View style={styles.grid}>
        <Skeleton width="32%" height={100} borderRadius={8} />
        <Skeleton width="32%" height={100} borderRadius={8} />
        <Skeleton width="32%" height={100} borderRadius={8} />
        <Skeleton width="32%" height={100} borderRadius={8} />
        <Skeleton width="32%" height={100} borderRadius={8} />
        <Skeleton width="32%" height={100} borderRadius={8} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0c29', paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 12,
  },
  avatarWrap: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 12,
  },
  infoBody: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '2%',
    marginTop: 8,
  },
});
