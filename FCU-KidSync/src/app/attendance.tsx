import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

export default function AttendanceScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { child, attendance } = useAuth();

  const [filterStatus, setFilterStatus] = useState<string>('All');

  const isCheckedOut = Boolean(attendance?.time_out);

  const history = [
    { date: 'Oct 06, 2026', day: 'Today', status: 'Present', timeIn: '07:48 AM', timeOut: isCheckedOut ? attendance?.time_out || '11:30 AM' : 'In Class', tag: 'On Time', reader: 'RFID Main Gate' },
    { date: 'Oct 05, 2026', day: 'Monday', status: 'Present', timeIn: '07:45 AM', timeOut: '11:30 AM', tag: 'On Time', reader: 'RFID Main Gate' },
    { date: 'Oct 02, 2026', day: 'Friday', status: 'Present', timeIn: '07:52 AM', timeOut: '11:30 AM', tag: 'On Time', reader: 'RFID Main Gate' },
    { date: 'Oct 01, 2026', day: 'Thursday', status: 'Late', timeIn: '08:14 AM', timeOut: '11:30 AM', tag: 'Late', reader: 'RFID Main Gate' },
    { date: 'Sep 30, 2026', day: 'Wednesday', status: 'Present', timeIn: '07:40 AM', timeOut: '11:30 AM', tag: 'On Time', reader: 'RFID Main Gate' },
    { date: 'Sep 29, 2026', day: 'Tuesday', status: 'Absent', timeIn: '--:--', timeOut: '--:--', tag: 'Excused - Medical', reader: 'Official Sick Note' },
    { date: 'Sep 28, 2026', day: 'Monday', status: 'Present', timeIn: '07:46 AM', timeOut: '11:30 AM', tag: 'On Time', reader: 'RFID Main Gate' },
  ];

  const filteredHistory = history.filter((item) => {
    if (filterStatus === 'All') return true;
    return item.status === filterStatus;
  });

  const daysPresent = history.filter((i) => i.status === 'Present').length;
  const daysAbsent = history.filter((i) => i.status === 'Absent').length;
  const daysLate = history.filter((i) => i.status === 'Late').length;

  return (
    <SafeAreaView style={[styles.safeArea, isDark && styles.safeAreaDark]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={[styles.title, isDark && styles.textWhite]}>Attendance Log</Text>
          <Text style={styles.subText}>Official attendance history for {child.name}</Text>
        </View>

        {/* KPI Metrics */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiBox, isDark && styles.cardDark]}>
            <Text style={styles.kpiLabel}>PRESENT</Text>
            <Text style={[styles.kpiValue, { color: '#10B981' }]}>{daysPresent}</Text>
            <Text style={styles.kpiSub}>Days</Text>
          </View>
          <View style={[styles.kpiBox, isDark && styles.cardDark]}>
            <Text style={styles.kpiLabel}>ABSENT</Text>
            <Text style={[styles.kpiValue, { color: '#EF4444' }]}>{daysAbsent}</Text>
            <Text style={styles.kpiSub}>Excused</Text>
          </View>
          <View style={[styles.kpiBox, isDark && styles.cardDark]}>
            <Text style={styles.kpiLabel}>TARDY</Text>
            <Text style={[styles.kpiValue, { color: '#F59E0B' }]}>{daysLate}</Text>
            <Text style={styles.kpiSub}>Minimal</Text>
          </View>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {['All', 'Present', 'Late', 'Absent'].map((st) => (
            <TouchableOpacity
              key={st}
              style={[styles.filterChip, filterStatus === st && styles.filterChipActive]}
              onPress={() => setFilterStatus(st)}
            >
              <Text style={[styles.filterChipText, filterStatus === st && styles.textWhite]}>
                {st}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Attendance List */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <Text style={[styles.cardTitle, isDark && styles.textWhite]}>History Records</Text>
          
          <View style={{ marginTop: 12 }}>
            {filteredHistory.map((item, idx) => (
              <View key={idx} style={[styles.historyRow, isDark && styles.historyRowDark]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dateText, isDark && styles.textWhite]}>{item.date}</Text>
                  <Text style={styles.dayText}>{item.day}</Text>
                </View>

                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.timeText, isDark && styles.textWhite]}>
                    {item.timeIn} - {item.timeOut}
                  </Text>
                  <Text style={styles.readerText}>{item.reader}</Text>
                </View>

                <View style={[
                  styles.statusBadge,
                  item.status === 'Present' ? styles.bgGreen : item.status === 'Late' ? styles.bgAmber : styles.bgRed
                ]}>
                  <Text style={[
                    styles.statusText,
                    item.status === 'Present' ? styles.textGreen : item.status === 'Late' ? styles.textAmber : styles.textRed
                  ]}>
                    {item.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  safeAreaDark: { backgroundColor: '#0F172A' },
  container: { padding: 16, paddingBottom: 100 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  subText: { fontSize: 12, color: '#64748B', fontWeight: '500', marginTop: 2 },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  kpiBox: { flex: 1, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  kpiLabel: { fontSize: 9, fontWeight: '800', color: '#64748B' },
  kpiValue: { fontSize: 24, fontWeight: '900', marginVertical: 2 },
  kpiSub: { fontSize: 10, color: '#64748B', fontWeight: '600' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterChip: { backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  filterChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  filterChipText: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  cardDark: { backgroundColor: '#1E293B', borderColor: '#334155' },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#F8FAFC', borderRadius: 14, marginBottom: 8 },
  historyRowDark: { backgroundColor: '#0F172A' },
  dateText: { fontSize: 13, fontWeight: '900', color: '#0F172A' },
  dayText: { fontSize: 11, color: '#64748B' },
  timeText: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  readerText: { fontSize: 10, color: '#64748B' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  bgGreen: { backgroundColor: '#D1FAE5' },
  bgAmber: { backgroundColor: '#FEF3C7' },
  bgRed: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 11, fontWeight: '900' },
  textGreen: { color: '#065F46' },
  textAmber: { color: '#92400E' },
  textRed: { color: '#991B1B' },
  textWhite: { color: '#FFFFFF' },
});
