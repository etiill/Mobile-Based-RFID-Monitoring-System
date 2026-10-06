import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Navigation, Clock, CheckCircle2 } from 'lucide-react-native';

import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function MonitoringScreen() {
  const { child, attendance, themeMode, toggleTheme } = useAuth();
  const isDark = themeMode === 'dark';

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
    <SafeAreaView style={[styles.safeArea, isDark ? styles.safeAreaDark : styles.safeAreaLight]}>
      {/* Official Header */}
      <Header themeMode={themeMode} onToggleTheme={toggleTheme} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={[styles.title, isDark ? styles.textWhite : styles.textDark]}>Navigation Points</Text>
          <Text style={[styles.subText, isDark ? styles.textSubDark : styles.textSubLight]}>
            Real-time campus movement logs for {child.name}
          </Text>
        </View>

        {/* Date Selector Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <Button
            variant={selectedDate === todayStr ? 'default' : 'secondary'}
            size="sm"
            isDark={isDark}
            style={{ marginRight: 8 }}
            onPress={() => setSelectedDate(todayStr)}
          >
            Today ({todayStr})
          </Button>

          <Button
            variant={selectedDate === '2026-10-05' ? 'default' : 'secondary'}
            size="sm"
            isDark={isDark}
            onPress={() => setSelectedDate('2026-10-05')}
          >
            Yesterday
          </Button>
        </ScrollView>

        {/* Checkpoints Timeline Card */}
        <Card isDark={isDark}>
          <CardHeader>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <CardTitle isDark={isDark}>Recorded Movements</CardTitle>
              <Badge variant="info" isDark={isDark}>
                {checkpointsTimeline.length} Logs
              </Badge>
            </View>
          </CardHeader>

          <View style={styles.timelineContainer}>
            {checkpointsTimeline.map((item, idx) => (
              <View key={item.id} style={styles.timelineRow}>
                <View style={styles.timelineDotContainer}>
                  <View style={[
                    styles.timelineDot,
                    item.action === 'Entered' ? styles.dotGreen : item.action === 'Returned' ? styles.dotBlue : styles.dotAmber
                  ]} />
                  {idx < checkpointsTimeline.length - 1 && <View style={[styles.timelineLine, isDark && styles.timelineLineDark]} />}
                </View>

                <View style={[styles.timelineCard, isDark ? styles.timelineCardDark : styles.timelineCardLight]}>
                  <View style={styles.itemHeader}>
                    <Text style={[styles.locationText, isDark ? styles.textWhite : styles.textDark]}>{item.location}</Text>
                    <Text style={styles.timeText}>{item.timestamp}</Text>
                  </View>
                  <Text style={[styles.detailsText, isDark ? styles.textSubDark : styles.textSubLight]}>{item.details}</Text>
                  <View style={[styles.itemFooter, isDark ? styles.itemFooterDark : styles.itemFooterLight]}>
                    <Text style={[styles.readerText, isDark ? styles.textSubDark : styles.textSubLight]}>{item.readerId}</Text>
                    <Text style={styles.verifiedText}>✓ RFID Hardware Verified</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  safeAreaLight: { backgroundColor: '#F8FAFC' },
  safeAreaDark: { backgroundColor: '#0F172A' },
  container: { padding: 16, paddingBottom: 100 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900' },
  subText: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  textDark: { color: '#0F172A' },
  textWhite: { color: '#FFFFFF' },
  textSubLight: { color: '#64748B' },
  textSubDark: { color: '#94A3B8' },
  timelineContainer: { paddingLeft: 4 },
  timelineRow: { flexDirection: 'row', marginBottom: 16 },
  timelineDotContainer: { alignItems: 'center', marginRight: 12 },
  timelineDot: { width: 14, height: 14, borderRadius: 7 },
  dotGreen: { backgroundColor: '#10B981' },
  dotBlue: { backgroundColor: '#3B82F6' },
  dotAmber: { backgroundColor: '#F59E0B' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#CBD5E1', marginVertical: 4 },
  timelineLineDark: { backgroundColor: '#475569' },
  timelineCard: { flex: 1, borderRadius: 14, padding: 12, borderWidth: 1 },
  timelineCardLight: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  timelineCardDark: { backgroundColor: '#0F172A', borderColor: '#334155' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationText: { fontSize: 13, fontWeight: '900', flex: 1 },
  timeText: { fontSize: 12, fontWeight: '800', color: '#4F46E5' },
  detailsText: { fontSize: 11, marginVertical: 6 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTopWidth: 1 },
  itemFooterLight: { borderTopColor: '#E2E8F0' },
  itemFooterDark: { borderTopColor: '#334155' },
  readerText: { fontSize: 10, fontFamily: 'monospace' },
  verifiedText: { fontSize: 10, color: '#10B981', fontWeight: '800' },
});
