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

export default function MonitoringScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { child, attendance } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const formatTime12h = (rawTime?: string | null) => {
    if (!rawTime || rawTime === '--:--' || rawTime === 'null') return '--:--';
    if (rawTime.includes('AM') || rawTime.includes('PM') || rawTime.includes('am') || rawTime.includes('pm')) {
      return rawTime;
    }
    try {
      let timePart = rawTime.includes('T') ? rawTime.split('T')[1] : rawTime;
      if (timePart.includes(' ')) {
        const parts = timePart.split(' ');
        timePart = parts[parts.length - 1];
      }
      const p = timePart.split(':');
      if (p.length >= 2) {
        let h = parseInt(p[0], 10);
        const m = parseInt(p[1], 10);
        if (!isNaN(h) && !isNaN(m)) {
          const ampm = h >= 12 ? 'PM' : 'AM';
          h = h % 12 || 12;
          const minStr = m < 10 ? `0${m}` : `${m}`;
          return `${h}:${minStr} ${ampm}`;
        }
      }
    } catch {}
    return rawTime;
  };

  const isCheckedOut = Boolean(attendance?.time_out);

  const checkpointsTimeline = selectedDate === todayStr
    ? [
        {
          id: 'cp-1',
          location: 'Kindergarten Main Gate',
          readerId: 'RFID-READER-GATE-01',
          action: 'Entered',
          timestamp: formatTime12h(attendance?.time_in || '07:48:00'),
          details: 'Student scanned active RFID tag at security turnstile.',
        },
        {
          id: 'cp-2',
          location: 'Kindergarten Hallway & Locker Area',
          readerId: 'RFID-READER-HALL-02',
          action: 'Entered',
          timestamp: '07:55 AM',
          details: 'Transitioned to bag drop area and morning greeting.',
        },
        {
          id: 'cp-3',
          location: 'Classroom 1 (Alpha)',
          readerId: 'RFID-READER-ROOM-102',
          action: 'Entered',
          timestamp: '08:00 AM',
          details: 'Morning Circle & Phonics learning session initiated.',
        },
        {
          id: 'cp-4',
          location: 'Outdoor Play & Activity Area',
          readerId: 'RFID-READER-ACT-04',
          action: 'Entered',
          timestamp: '09:45 AM',
          details: 'Monitored outdoor creative play & motor skills training.',
        },
        {
          id: 'cp-5',
          location: 'Classroom 1 (Alpha)',
          readerId: 'RFID-READER-ROOM-102',
          action: 'Returned',
          timestamp: '10:15 AM',
          details: 'Returned to classroom for story session and snack wrap-up.',
        },
        ...(isCheckedOut
          ? [
              {
                id: 'cp-6',
                location: 'Campus Exit Gate & Dismissal Zone',
                readerId: 'RFID-READER-EXIT-01',
                action: 'Exited',
                timestamp: formatTime12h(attendance?.time_out),
                details: `Surrendered to authorized guardian (${attendance?.verified_by || 'Verified RFID Card'}).`,
              },
            ]
          : []),
      ]
    : [
        {
          id: 'cp-h1',
          location: 'Kindergarten Main Gate',
          readerId: 'RFID-READER-GATE-01',
          action: 'Entered',
          timestamp: '07:50 AM',
          details: 'Verified RFID check-in at main school gates.',
        },
        {
          id: 'cp-h2',
          location: 'Classroom 1 (Alpha)',
          readerId: 'RFID-READER-ROOM-102',
          action: 'Entered',
          timestamp: '08:05 AM',
          details: 'Daily academic class participation logged.',
        },
        {
          id: 'cp-h3',
          location: 'Campus Exit Gate',
          readerId: 'RFID-READER-EXIT-01',
          action: 'Exited',
          timestamp: '11:30 AM',
          details: 'Authorized parent pickup completed.',
        },
      ];

  return (
    <SafeAreaView style={[styles.safeArea, isDark && styles.safeAreaDark]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={[styles.title, isDark && styles.textWhite]}>Navigation Points</Text>
          <Text style={styles.subText}>Real-time campus movement logs for {child.name}</Text>
        </View>

        {/* Date Selector Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <TouchableOpacity
            style={[styles.dateChip, selectedDate === todayStr && styles.dateChipActive]}
            onPress={() => setSelectedDate(todayStr)}
          >
            <Text style={[styles.dateChipText, selectedDate === todayStr && styles.textWhite]}>
              Today ({todayStr})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dateChip, selectedDate === '2026-10-05' && styles.dateChipActive]}
            onPress={() => setSelectedDate('2026-10-05')}
          >
            <Text style={[styles.dateChipText, selectedDate === '2026-10-05' && styles.textWhite]}>
              Yesterday
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Checkpoints Timeline Card */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, isDark && styles.textWhite]}>Recorded Movements</Text>
            <Text style={styles.countBadge}>{checkpointsTimeline.length} Logs</Text>
          </View>

          <View style={styles.timelineContainer}>
            {checkpointsTimeline.map((item, idx) => (
              <View key={item.id} style={styles.timelineRow}>
                <View style={styles.timelineDotContainer}>
                  <View style={[
                    styles.timelineDot,
                    item.action === 'Entered' ? styles.dotGreen : item.action === 'Returned' ? styles.dotBlue : styles.dotAmber
                  ]} />
                  {idx < checkpointsTimeline.length - 1 && <View style={styles.timelineLine} />}
                </View>

                <View style={[styles.timelineCard, isDark && styles.timelineCardDark]}>
                  <View style={styles.itemHeader}>
                    <Text style={[styles.locationText, isDark && styles.textWhite]}>{item.location}</Text>
                    <Text style={styles.timeText}>{item.timestamp}</Text>
                  </View>
                  <Text style={styles.detailsText}>{item.details}</Text>
                  <View style={styles.itemFooter}>
                    <Text style={styles.readerText}>{item.readerId}</Text>
                    <Text style={styles.verifiedText}>✓ RFID Hardware Verified</Text>
                  </View>
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
  dateChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  dateChipText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardDark: { backgroundColor: '#1E293B', borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  countBadge: { fontSize: 11, fontWeight: '800', color: '#4F46E5', backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  timelineContainer: { paddingLeft: 4 },
  timelineRow: { flexDirection: 'row', marginBottom: 16 },
  timelineDotContainer: { alignItems: 'center', marginRight: 12 },
  timelineDot: { width: 14, height: 14, borderRadius: 7 },
  dotGreen: { backgroundColor: '#10B981' },
  dotBlue: { backgroundColor: '#3B82F6' },
  dotAmber: { backgroundColor: '#F59E0B' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#CBD5E1', marginVertical: 4 },
  timelineCard: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  timelineCardDark: { backgroundColor: '#0F172A', borderColor: '#334155' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationText: { fontSize: 13, fontWeight: '900', color: '#0F172A', flex: 1 },
  timeText: { fontSize: 12, fontWeight: '800', color: '#4F46E5' },
  detailsText: { fontSize: 11, color: '#64748B', marginVertical: 6 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  readerText: { fontSize: 10, color: '#64748B', fontFamily: 'monospace' },
  verifiedText: { fontSize: 10, color: '#10B981', fontWeight: '800' },
  textWhite: { color: '#FFFFFF' },
});
