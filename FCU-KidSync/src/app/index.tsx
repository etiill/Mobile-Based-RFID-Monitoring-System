import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Sun,
  Moon,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  BookOpen,
  Calendar,
  Sparkles,
  Activity,
  ShieldCheck,
  UserCheck,
  ChevronRight,
  X,
} from 'lucide-react-native';

import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function HomeScreen() {
  const { user, child, attendance, themeMode, toggleTheme } = useAuth();
  const isDark = themeMode === 'dark';

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isUpdatesOpen, setIsUpdatesOpen] = useState(false);

  // Time-based info
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return { text: 'Good Morning', isDay: true };
    if (hour >= 12 && hour < 18) return { text: 'Good Afternoon', isDay: true };
    return { text: 'Good Evening', isDay: false };
  };

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
  const isPresentAtSchool = !isCheckedOut && (attendance?.status === 'Present' || attendance?.status === 'Late' || Boolean(attendance?.time_in));

  const statusLabel = isCheckedOut
    ? 'Safely Checked Out'
    : isPresentAtSchool
    ? 'Currently at School'
    : 'Awaiting Arrival';

  const greetingInfo = getTimeBasedGreeting();
  const parentName = user?.name || 'Parent';

  const movementPeek = [
    { location: 'Kindergarten Main Gate', action: 'Entered', time: formatTime12h(attendance?.time_in || '07:48:00'), reader: 'RFID-GATE-01' },
    { location: 'Classroom 1 (Alpha)', action: 'Entered', time: '08:00 AM', reader: 'RFID-ROOM-102' },
    { location: 'Playground & Activity Area', action: 'Entered', time: '09:45 AM', reader: 'RFID-ACT-04' },
    ...(isCheckedOut ? [{ location: 'Campus Exit Gate', action: 'Exited', time: formatTime12h(attendance?.time_out), reader: 'RFID-EXIT-01' }] : []),
  ];

  return (
    <SafeAreaView style={[styles.safeArea, isDark ? styles.safeAreaDark : styles.safeAreaLight]}>
      {/* Official Header */}
      <Header themeMode={themeMode} onToggleTheme={toggleTheme} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Greeting Banner */}
        <Card isDark={isDark}>
          <View style={styles.greetingHeader}>
            <View style={[styles.iconWrapper, isDark ? styles.iconWrapperDark : styles.iconWrapperLight]}>
              {greetingInfo.isDay ? (
                <Sun size={24} color="#F59E0B" />
              ) : (
                <Moon size={24} color="#818CF8" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greetingText, isDark ? styles.textWhite : styles.textDark]}>
                {greetingInfo.text}, {parentName} 👋
              </Text>
              <Text style={[styles.subText, isDark ? styles.textSubDark : styles.textSubLight]}>
                Real-time safety & RFID monitoring for <Text style={styles.boldText}>{child.name}</Text>.
              </Text>
            </View>
          </View>
        </Card>

        {/* Hero Student Status Card */}
        <Card isDark={isDark}>
          <View style={styles.heroRow}>
            <Avatar size={60} fallbackText={child.name} isDark={isDark} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.studentName, isDark ? styles.textWhite : styles.textDark]}>{child.name}</Text>
              <Badge variant="default" style={{ marginTop: 4 }}>
                {child.section ? `${child.section.year_level} - ${child.section.section_name}` : 'Kindergarten - Alpha'}
              </Badge>
              <Text style={[styles.rfidText, isDark ? styles.textSubDark : styles.textSubLight]}>Tag ID: {child.rfid}</Text>
            </View>
          </View>

          {/* Status Indicator */}
          <View style={[styles.statusBox, isDark ? styles.statusBoxDark : styles.statusBoxLight]}>
            <Text style={[styles.statusLabelTitle, isDark ? styles.textSubDark : styles.textSubLight]}>Current Location Status:</Text>
            <Badge
              variant={isCheckedOut ? 'info' : isPresentAtSchool ? 'success' : 'warning'}
              isDark={isDark}
            >
              {statusLabel}
            </Badge>
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, isDark ? styles.statBoxDark : styles.statBoxLight]}>
              <Text style={[styles.statLabel, isDark ? styles.textSubDark : styles.textSubLight]}>ARRIVAL</Text>
              <Text style={[styles.statValue, isDark ? styles.textWhite : styles.textDark]}>
                {formatTime12h(attendance?.time_in || '07:48:00')}
              </Text>
              <Text style={styles.statTagGreen}>✓ Verified</Text>
            </View>

            <View style={[styles.statBox, isDark ? styles.statBoxDark : styles.statBoxLight]}>
              <Text style={[styles.statLabel, isDark ? styles.textSubDark : styles.textSubLight]}>DISMISSAL</Text>
              <Text style={[styles.statValue, isDark ? styles.textWhite : styles.textDark]}>
                {isCheckedOut ? formatTime12h(attendance?.time_out) : '11:30 AM'}
              </Text>
              <Text style={[styles.statTagMuted, isDark ? styles.textSubDark : styles.textSubLight]}>
                {isCheckedOut ? 'Completed' : 'Scheduled'}
              </Text>
            </View>

            <View style={[styles.statBox, isDark ? styles.statBoxDark : styles.statBoxLight]}>
              <Text style={[styles.statLabel, isDark ? styles.textSubDark : styles.textSubLight]}>TEACHER</Text>
              <Text style={[styles.statValue, isDark ? styles.textWhite : styles.textDark]} numberOfLines={1}>
                {child.section?.teacher?.name || 'Ana Maria Reyes'}
              </Text>
              <Text style={styles.statTagPrimary}>Lead Adviser</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Button
              variant="default"
              size="md"
              style={{ flex: 1 }}
              onPress={() => setIsScheduleOpen(true)}
            >
              Class Schedule
            </Button>

            <Button
              variant="secondary"
              size="md"
              isDark={isDark}
              style={{ flex: 1 }}
              onPress={() => setIsUpdatesOpen(true)}
            >
              Class Updates
            </Button>
          </View>
        </Card>

        {/* Movement Timeline Peek */}
        <Card isDark={isDark}>
          <CardHeader>
            <CardTitle isDark={isDark}>📍 Today's Movement Logs</CardTitle>
            <CardDescription isDark={isDark}>Latest RFID checkpoint readings for {child.name}</CardDescription>
          </CardHeader>

          <View style={{ marginTop: 4 }}>
            {movementPeek.map((item, idx) => (
              <View key={idx} style={[styles.timelineItem, isDark ? styles.timelineItemDark : styles.timelineItemLight]}>
                <View style={styles.timelineLeft}>
                  <MapPin size={18} color={item.action === 'Entered' ? '#10B981' : item.action === 'Exited' ? '#3B82F6' : '#F59E0B'} />
                  <View>
                    <Text style={[styles.timelineLocation, isDark ? styles.textWhite : styles.textDark]}>{item.location}</Text>
                    <Text style={[styles.timelineReader, isDark ? styles.textSubDark : styles.textSubLight]}>{item.reader}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.timelineTime}>{item.time}</Text>
                  <Badge variant={item.action === 'Entered' ? 'success' : 'info'} isDark={isDark}>
                    {item.action}
                  </Badge>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Authorized Guardians Contacts */}
        <Card isDark={isDark}>
          <CardHeader>
            <CardTitle isDark={isDark}>👨‍👩‍👧 Authorized Guardians</CardTitle>
            <CardDescription isDark={isDark}>Registered emergency pickup contacts</CardDescription>
          </CardHeader>

          <View style={{ marginTop: 4 }}>
            {child.guardians.map((g, idx) => (
              <View key={idx} style={[styles.guardianRow, isDark ? styles.guardianRowDark : styles.guardianRowLight]}>
                <Avatar size={40} fallbackText={g.name} isDark={isDark} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.guardianName, isDark ? styles.textWhite : styles.textDark]}>{g.name}</Text>
                  <Text style={styles.guardianRelation}>{g.relation}</Text>
                </View>
                <Button
                  variant="default"
                  size="sm"
                  onPress={() => Linking.openURL(`tel:${g.phone.replace(/\s+/g, '')}`)}
                >
                  Call
                </Button>
              </View>
            ))}
          </View>
        </Card>

      </ScrollView>

      {/* Schedule Modal */}
      <Modal visible={isScheduleOpen} transparent animationType="fade" onRequestClose={() => setIsScheduleOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDark ? styles.modalCardDark : styles.modalCardLight]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark ? styles.textWhite : styles.textDark]}>Kindergarten Class Schedule</Text>
              <TouchableOpacity onPress={() => setIsScheduleOpen(false)}>
                <X size={20} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.subText, isDark ? styles.textSubDark : styles.textSubLight]}>Section Alpha Routine Timetable</Text>

            <ScrollView style={{ maxHeight: 300, marginVertical: 12 }}>
              {[
                { time: '07:30 AM – 08:00 AM', title: 'Student Arrival & RFID Gate Tap' },
                { time: '08:00 AM – 08:45 AM', title: 'Morning Circle & Phonics Play' },
                { time: '08:45 AM – 09:30 AM', title: 'Numbers & Interactive Math' },
                { time: '09:30 AM – 10:00 AM', title: 'Recess & Monitored Snack Break' },
                { time: '10:00 AM – 10:45 AM', title: 'Arts, Crafts & Motor Activity' },
                { time: '10:45 AM – 11:15 AM', title: 'Storytelling & Bag Packing' },
                { time: '11:15 AM – 11:30 AM', title: 'Authorized Guardian Pickup' },
              ].map((slot, idx) => (
                <View key={idx} style={[styles.modalSlot, isDark ? styles.timelineItemDark : styles.timelineItemLight]}>
                  <Text style={styles.modalSlotTime}>{slot.time}</Text>
                  <Text style={[styles.modalSlotTitle, isDark ? styles.textWhite : styles.textDark]}>{slot.title}</Text>
                </View>
              ))}
            </ScrollView>

            <Button variant="default" size="md" onPress={() => setIsScheduleOpen(false)}>
              Close Schedule
            </Button>
          </View>
        </View>
      </Modal>

      {/* Class Updates Modal */}
      <Modal visible={isUpdatesOpen} transparent animationType="fade" onRequestClose={() => setIsUpdatesOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDark ? styles.modalCardDark : styles.modalCardLight]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark ? styles.textWhite : styles.textDark]}>Class Updates & Notices</Text>
              <TouchableOpacity onPress={() => setIsUpdatesOpen(false)}>
                <X size={20} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.subText, isDark ? styles.textSubDark : styles.textSubLight]}>Announcements from Adviser {child.section?.teacher?.name}</Text>

            <ScrollView style={{ maxHeight: 280, marginVertical: 12 }}>
              <Alert variant="success" isDark={isDark}>
                <AlertTitle isDark={isDark}>Nutrition Week Fruit Parade 🍎</AlertTitle>
                <AlertDescription isDark={isDark}>
                  Please bring a sliced fruit for tomorrow's healthy sharing activity!
                </AlertDescription>
              </Alert>

              <Alert variant="info" isDark={isDark}>
                <AlertTitle isDark={isDark}>Phonics Reading Practice 📚</AlertTitle>
                <AlertDescription isDark={isDark}>
                  Emma read 10 new words today with high enthusiasm during morning circle.
                </AlertDescription>
              </Alert>
            </ScrollView>

            <Button variant="default" size="md" onPress={() => setIsUpdatesOpen(false)}>
              Close Announcements
            </Button>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  safeAreaLight: { backgroundColor: '#F8FAFC' },
  safeAreaDark: { backgroundColor: '#0F172A' },
  container: { padding: 16, paddingBottom: 100 },
  greetingHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapperLight: { backgroundColor: '#FEF3C7' },
  iconWrapperDark: { backgroundColor: '#312E81' },
  greetingText: { fontSize: 18, fontWeight: '900' },
  subText: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  textDark: { color: '#0F172A' },
  textWhite: { color: '#FFFFFF' },
  textSubLight: { color: '#64748B' },
  textSubDark: { color: '#94A3B8' },
  boldText: { fontWeight: '800', color: '#4F46E5' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  studentName: { fontSize: 20, fontWeight: '900' },
  rfidText: { fontSize: 11, fontFamily: 'monospace', marginTop: 4 },
  statusBox: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBoxLight: { backgroundColor: '#F1F5F9' },
  statusBoxDark: { backgroundColor: '#0F172A' },
  statusLabelTitle: { fontSize: 11, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statBox: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
  },
  statBoxLight: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  statBoxDark: { backgroundColor: '#0F172A', borderColor: '#334155' },
  statLabel: { fontSize: 9, fontWeight: '800' },
  statValue: { fontSize: 13, fontWeight: '900', marginVertical: 2 },
  statTagGreen: { fontSize: 10, fontWeight: '800', color: '#10B981' },
  statTagMuted: { fontSize: 10, fontWeight: '700' },
  statTagPrimary: { fontSize: 10, fontWeight: '800', color: '#4F46E5' },
  actionRow: { flexDirection: 'row', gap: 10 },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  timelineItemLight: { backgroundColor: '#F8FAFC' },
  timelineItemDark: { backgroundColor: '#0F172A' },
  timelineLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timelineLocation: { fontSize: 12, fontWeight: '800' },
  timelineReader: { fontSize: 10, fontFamily: 'monospace' },
  timelineTime: { fontSize: 12, fontWeight: '800', color: '#4F46E5' },
  guardianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 14,
    marginBottom: 8,
  },
  guardianRowLight: { backgroundColor: '#F8FAFC' },
  guardianRowDark: { backgroundColor: '#0F172A' },
  guardianName: { fontSize: 13, fontWeight: '800' },
  guardianRelation: { fontSize: 11, color: '#10B981', fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 24,
    padding: 20,
  },
  modalCardLight: { backgroundColor: '#FFFFFF' },
  modalCardDark: { backgroundColor: '#1E293B' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalSlot: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  modalSlotTime: { fontSize: 11, fontWeight: '800', color: '#4F46E5' },
  modalSlotTitle: { fontSize: 12, fontWeight: '700', marginTop: 2 },
});
