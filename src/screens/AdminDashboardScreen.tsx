import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { colors } from '../theme/colors';
import { useSafety } from '../context/SafetyContext';

const METRICS = [
  {
    key: 'users',
    label: 'Total Users',
    value: '2,847',
    change: '+12%',
    positive: true,
    icon: 'people-outline',
  },
  {
    key: 'children',
    label: 'Children Monitored',
    value: '1,432',
    change: '+8%',
    positive: true,
    icon: 'people-outline',
  },
  {
    key: 'emergency',
    label: 'Emergency Cases',
    value: '18',
    change: '-23%',
    positive: false,
    icon: 'notifications-outline',
  },
  {
    key: 'ai',
    label: 'AI Events',
    value: '3,291',
    change: '+34%',
    positive: true,
    icon: 'flash-outline',
  },
];

// Simple bar chart data: 6am, 9am, 12pm, 3pm, 6pm, 9pm
const CHART_VALUES = [0, 42, 38, 55, 45, 25];
const CHART_LABELS = ['6am', '9am', '12pm', '3pm', '6pm', '9pm'];
const MAX_BAR = 60;

function BarChart() {
  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.barsRow}>
        {CHART_VALUES.map((v, i) => (
          <View key={i} style={chartStyles.barWrapper}>
            <View
              style={[
                chartStyles.bar,
                { height: `${(v / MAX_BAR) * 100}%` },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={chartStyles.labelsRow}>
        {CHART_LABELS.map((label, i) => (
          <Text key={i} style={chartStyles.label}>{label}</Text>
        ))}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    height: 160,
    marginTop: 12,
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  barWrapper: {
    flex: 1,
    height: 100,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 4,
  },
  bar: {
    width: '70%',
    minHeight: 4,
    backgroundColor: colors.info,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 8,
  },
  label: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export function AdminDashboardScreen({ navigation }: any) {
  const { emergencyHistory, fetchEmergencyHistory } = useSafety();

  useEffect(() => {
    void fetchEmergencyHistory();
  }, [fetchEmergencyHistory]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerSub}>Admin Console</Text>
          <Text style={styles.headerTitle}>System Dashboard</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="search-outline" size={22} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="notifications-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metricsGrid}>
          {METRICS.map((m) => (
            <Card key={m.key} style={styles.metricCard}>
              <Ionicons
                name={m.icon as any}
                size={22}
                color={m.key === 'emergency' ? colors.emergency : colors.primary}
              />
              <Text style={styles.metricLabel}>{m.label}</Text>
              <Text style={styles.metricValue}>{m.value}</Text>
              <View style={styles.changeRow}>
                <Ionicons
                  name={m.positive ? 'trending-up' : 'trending-down'}
                  size={16}
                  color={m.positive ? colors.success : colors.emergency}
                />
                <Text
                  style={[
                    styles.metricChange,
                    { color: m.positive ? colors.success : colors.emergency },
                  ]}
                >
                  {m.change}
                </Text>
              </View>
            </Card>
          ))}
        </View>

        <Card>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>AI Detection Events</Text>
            <TouchableOpacity style={styles.filterBtn}>
              <Ionicons name="filter-outline" size={18} color={colors.textPrimary} />
              <Text style={styles.filterText}>Filter</Text>
            </TouchableOpacity>
          </View>
          <BarChart />
        </Card>

        <Card>
          <View style={styles.logsHeader}>
            <Text style={styles.logsTitle}>System Logs</Text>
            <TouchableOpacity style={styles.viewAllBtn}>
              <Text style={styles.viewAllBtnText}>View All</Text>
            </TouchableOpacity>
          </View>
          {emergencyHistory.map((log, i) => (
            <View key={i} style={styles.logRow}>
              <View style={[styles.logBadge, { backgroundColor: colors.logCritical }]}>
                <Text style={styles.logBadgeText}>{String(log.level ?? 'Alert')}</Text>
              </View>
              <Text style={styles.logMessage} numberOfLines={1}>
                {String(log.message ?? log.reason ?? 'Emergency event')}
              </Text>
              <Text style={styles.logTime}>{String(log.time ?? log.created_at ?? '')}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundDark },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.backgroundDark,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
  },
  headerSub: {
    fontSize: 12,
    color: colors.textLight,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 4,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginTop: 8,
    gap: 8,
  },
  metricCard: {
    width: '47%',
    marginHorizontal: 0,
    marginVertical: 0,
  },
  metricLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  metricChange: {
    fontSize: 13,
    fontWeight: '600',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  viewAllBtn: {
    backgroundColor: colors.info,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewAllBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  logBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  logBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
  },
  logMessage: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  logTime: {
    fontSize: 12,
    color: colors.textLight,
  },
});
