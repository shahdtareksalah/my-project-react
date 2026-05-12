import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiGet, apiPost } from '../api/client';
import { colors } from '../theme/colors';

type AlertData = {
  id: string;
  status: 'active' | 'resolved';
  created_at: string;
  location: { type: string; coordinates: [number, number] } | [number, number]; // GeoJSON point or array
};

export function AlertHistoryScreen({ navigation }: any) {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const { response, data } = await apiGet('/emergency/history/');
      if (response.ok && Array.isArray(data)) {
        // Sort: Active first, then by date descending
        const sortedAlerts = data.sort((a: AlertData, b: AlertData) => {
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setAlerts(sortedAlerts);
      } else {
        Alert.alert('Error', 'Failed to fetch alert history.');
      }
    } catch (error) {
      console.error('Failed to fetch alerts', error);
      Alert.alert('Error', 'An error occurred while fetching alerts.');
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (id: string) => {
    try {
      const { response } = await apiPost(`/emergency/${id}/resolve/`, undefined);
      if (response.ok) {
        // Optimistic UI Update: Mark as resolved immediately
        setAlerts((prevAlerts) =>
          prevAlerts
            .map((alert) => (String(alert.id) === String(id) ? { ...alert, status: 'resolved' as const } : alert))
            .sort((a, b) => {
              if (a.status === 'active' && b.status !== 'active') return -1;
              if (a.status !== 'active' && b.status === 'active') return 1;
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            })
        );
      } else {
        Alert.alert('Error', 'Failed to resolve alert.');
      }
    } catch (error) {
      console.error('Failed to resolve alert', error);
      Alert.alert('Error', 'An error occurred while resolving the alert.');
    }
  };

  const renderItem = ({ item }: { item: AlertData }) => {
    const isActive = item.status === 'active';
    let lng = 0, lat = 0;
    
    // Parse GeoJSON
    if (Array.isArray(item.location)) {
      [lng, lat] = item.location;
    } else if (item.location?.coordinates) {
      [lng, lat] = item.location.coordinates;
    }

    return (
      <View style={[styles.card, isActive ? styles.activeCard : styles.resolvedCard]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.title, isActive ? styles.activeText : styles.resolvedText]}>
            <Ionicons name="warning" size={16} /> Status: {item.status.toUpperCase()}
          </Text>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color={isActive ? '#B91C1C' : '#4B5563'} />
          <Text style={[styles.locationText, isActive ? styles.activeText : styles.resolvedText]}>
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </Text>
        </View>

        {isActive && (
          <TouchableOpacity style={styles.resolveBtn} onPress={() => resolveAlert(item.id)}>
            <Text style={styles.resolveBtnText}>Mark as Safe</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alert History</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No alerts found.</Text>}
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
    backgroundColor: colors.backgroundDark,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1E2A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.white },
  listContent: { padding: 16 },
  loader: { flex: 1, justifyContent: 'center' },
  emptyText: { color: colors.textLight, textAlign: 'center', marginTop: 20 },
  
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  activeCard: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  resolvedCard: { backgroundColor: '#1E2A3A', borderColor: '#2E3E52' },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: 'bold' },
  activeText: { color: '#B91C1C' },
  resolvedText: { color: colors.textLight },
  date: { color: '#6B7280', fontSize: 12 },
  
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  locationText: { fontSize: 14, fontFamily: 'monospace' },
  
  resolveBtn: {
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  resolveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
});
