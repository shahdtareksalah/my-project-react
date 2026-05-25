import React, { useEffect } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useNotifications } from '../context/NotificationsContext';

export function NotificationsScreen({ navigation }: any) {
  const { notifications, refreshNotifications, markAllSeen, loading } = useNotifications();

  useEffect(() => {
    void refreshNotifications();
    // Mark all as seen when user opens the screen (Facebook-style)
    const timer = setTimeout(() => void markAllSeen(), 1000);
    return () => clearTimeout(timer);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'missed_call': return 'call-outline';
      case 'call': return 'call';
      case 'alert': return 'warning-outline';
      default: return 'notifications-outline';
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'missed_call': return '#FFF3E0';
      case 'call': return '#E3F2FD';
      case 'alert': return '#FEE2E2';
      default: return '#F5F5F5';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'missed_call': return '#FF9800';
      case 'call': return '#1976D2';
      case 'alert': return '#EF4444';
      default: return '#666';
    }
  };

  const renderItem = ({ item }: { item: typeof notifications[0] }) => (
    <View style={[styles.card, item.seen && styles.cardSeen]}>
      {!item.seen && <View style={styles.unseenDot} />}
      <View style={[styles.iconBg, { backgroundColor: getIconBg(item.type) }]}>
        <Ionicons name={getIcon(item.type) as any} size={22} color={getIconColor(item.type)} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.name, item.seen && styles.nameSeen]} numberOfLines={1}>{item.other_user_name}</Text>
        <Text style={[styles.message, item.seen && styles.messageSeen]} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.time}>
          {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => void refreshNotifications()}>
          <Ionicons name="refresh-outline" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {loading && notifications.length === 0 ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#1E2A3A',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.white },
  list: { padding: 16 },
  loader: { flex: 1, justifyContent: 'center' },
  empty: { color: colors.textLight, textAlign: 'center', marginTop: 20 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#1E2A3A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  cardSeen: {
    opacity: 0.5,
  },
  unseenDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#3B82F6',
    position: 'absolute', left: 6, top: 14,
  },
  iconBg: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  content: { flex: 1 },
  name: { color: colors.white, fontSize: 15, fontWeight: '700' },
  nameSeen: { fontWeight: '500', color: '#9CA3AF' },
  message: { color: colors.textLight, fontSize: 13, marginTop: 2 },
  messageSeen: { color: '#6B7280' },
  time: { color: '#6B7280', fontSize: 11, marginTop: 4 },
});
