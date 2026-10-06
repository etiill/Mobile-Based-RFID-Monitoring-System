import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Linking,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user, child, attendance } = useAuth();

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isUpdatesOpen, setIsUpdatesOpen] = useState(false);

  // Time-based info
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return { text: 'Good Morning', icon: '☀️' };
    if (hour >= 12 && hour < 18) return { text: 'Good Afternoon', icon: '🌤️' };
    return { text: 'Good Evening', icon: '🌙' };
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
    <SafeAreaView style={[styles.safeArea, isDark && styles.safeAreaDark]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Header Badge */}
        <View style={styles.badgeRow}>
          <View style={styles.shieldBadge}>
            <Text style={styles.shieldBadgeText}>🛡️ FCU KidSync • Parent Portal</Text>
          </View>
        </View>

        {/* Greeting Banner */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <View style={styles.greetingHeader}>
            <Text style={styles.greetingIcon}>{greetingInfo.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greetingText, isDark && styles.textWhite]}>
                {greetingInfo.text}, {parentName}
              </Text>
              <Text style={styles.subText}>
                Real-time safety & RFID monitoring for <Text style={styles.boldText}>{child.name}</Text>.
              </Text>
            </View>
          </View>
        </View>

        {/* Hero Student Status Card */}
        <View style={[styles.card, styles.heroCard, isDark && styles.cardDark]}>
          <View style={styles.heroRow}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{child.name.charAt(0)}</Text>
              <View style={styles.activeDot} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.studentName, isDark && styles.textWhite]}>{child.name}</Text>
              <Text style={styles.sectionBadge}>
                {child.section ? `${child.section.year_level} - ${child.section.section_name}` : 'Kindergarten - Alpha'}
              </Text>
              <Text style={styles.rfidText}>Tag ID: {child.rfid}</Text>
            </View>
          </View>

          {/* Status Indicator */}
          <View style={styles.statusBox}>
            <Text style={styles.statusLabelTitle}>Current Location Status:</Text>
            <View style={[
              styles.statusPill,
              isCheckedOut ? styles.pillBlue : isPresentAtSchool ? styles.pillGreen : styles.pillAmber
            ]}>
              <View style={[
                styles.statusDot,
                isCheckedOut ? styles.dotBlue : isPresentAtSchool ? styles.dotGreen : styles.dotAmber
              ]} />
              <Text style={[
                styles.statusPillText,
                isCheckedOut ? styles.textBlue : isPresentAtSchool ? styles.textGreen : styles.textAmber
              ]}>
                {statusLabel}
              </Text>
            </View>
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, isDark && styles.statBoxDark]}>
              <Text style={styles.statLabel}>ARRIVAL</Text>
              <Text style={[styles.statValue, isDark && styles.textWhite]}>
                {formatTime12h(attendance?.time_in || '07:48:00')}
              </Text>
              <Text style={styles.statTagGreen}>✓ Verified</Text>
            </View>

            <View style={[styles.statBox, isDark && styles.statBoxDark]}>
              <Text style={styles.statLabel}>DISMISSAL</Text>
              <Text style={[styles.statValue, isDark && styles.textWhite]}>
                {isCheckedOut ? formatTime12h(attendance?.time_out) : '11:30 AM'}
              </Text>
              <Text style={styles.statTagMuted}>{isCheckedOut ? 'Completed' : 'Scheduled'}</Text>
            </View>

            <View style={[styles.statBox, isDark && styles.statBoxDark]}>
              <Text style={styles.statLabel}>TEACHER</Text>
              <Text style={[styles.statValue, isDark && styles.textWhite]} numberOfLines={1}>
                {child.section?.teacher?.name || 'Ana Maria Reyes'}
              </Text>
              <Text style={styles.statTagPrimary}>Lead Adviser</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => setIsScheduleOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPrimaryText}>⏰ Class Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnSecondary, isDark && styles.btnSecondaryDark]}
              onPress={() => setIsUpdatesOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnSecondaryText, isDark && styles.textWhite]}>📖 Class Updates</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Movement Timeline Peek */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <Text style={[styles.cardTitle, isDark && styles.textWhite]}>📍 Today's Movement Logs</Text>
          <Text style={styles.subText}>Latest RFID checkpoint readings for {child.name}</Text>

          <View style={{ marginTop: 12 }}>
            {movementPeek.map((item, idx) => (
              <View key={idx} style={[styles.timelineItem, isDark && styles.timelineItemDark]}>
                <View style={styles.timelineLeft}>
                  <Text style={styles.timelineIcon}>
                    {item.action === 'Entered' ? '🟢' : item.action === 'Exited' ? '🔵' : '🟡'}
                  </Text>
                  <View>
                    <Text style={[styles.timelineLocation, isDark && styles.textWhite]}>{item.location}</Text>
                    <Text style={styles.timelineReader}>{item.reader}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.timelineTime, isDark && styles.textWhite]}>{item.time}</Text>
                  <Text style={styles.timelineAction}>{item.action}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Authorized Guardians Contacts */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <Text style={[styles.cardTitle, isDark && styles.textWhite]}>👨‍👩‍👧 Authorized Guardians</Text>
          <Text style={styles.subText}>Registered emergency pickup contacts</Text>

          <View style={{ marginTop: 12 }}>
            {child.guardians.map((g, idx) => (
              <View key={idx} style={[styles.guardianRow, isDark && styles.guardianRowDark]}>
                <View style={styles.guardianAvatar}>
                  <Text style={styles.guardianAvatarText}>{g.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.guardianName, isDark && styles.textWhite]}>{g.name}</Text>
                  <Text style={styles.guardianRelation}>{g.relation}</Text>
                </View>
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => Linking.openURL(`tel:${g.phone.replace(/\s+/g, '')}`)}
                >
                  <Text style={styles.callBtnText}>📞 Call</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Schedule Modal */}
      <Modal visible={isScheduleOpen} transparent animationType="fade" onRequestClose={() => setIsScheduleOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDark && styles.cardDark]}>
            <Text style={[styles.modalTitle, isDark && styles.textWhite]}>Kindergarten Class Schedule</Text>
            <Text style={styles.subText}>Section Alpha Routine Timetable</Text>

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
                <View key={idx} style={styles.modalSlot}>
                  <Text style={styles.modalSlotTime}>{slot.time}</Text>
                  <Text style={[styles.modalSlotTitle, isDark && styles.textWhite]}>{slot.title}</Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.btnPrimary} onPress={() => setIsScheduleOpen(false)}>
              <Text style={styles.btnPrimaryText}>Close Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Class Updates Modal */}
      <Modal visible={isUpdatesOpen} transparent animationType="fade" onRequestClose={() => setIsUpdatesOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDark && styles.cardDark]}>
            <Text style={[styles.modalTitle, isDark && styles.textWhite]}>Class Updates & Notices</Text>
            <Text style={styles.subText}>Announcements from Adviser {child.section?.teacher?.name}</Text>

            <ScrollView style={{ maxHeight: 280, marginVertical: 12 }}>
              <View style={styles.noticeBox}>
                <Text style={styles.noticeTitle}>Nutrition Week Fruit Parade 🍎</Text>
                <Text style={styles.noticeBody}>
                  Please bring a sliced fruit for tomorrow's healthy sharing activity!
                </Text>
              </View>
              <View style={styles.noticeBox}>
                <Text style={styles.noticeTitle}>Phonics Reading Practice 📚</Text>
                <Text style={styles.noticeBody}>
                  Emma read 10 new words today with high enthusiasm during morning circle.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.btnPrimary} onPress={() => setIsUpdatesOpen(false)}>
              <Text style={styles.btnPrimaryText}>Close Announcements</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  safeAreaDark: { backgroundColor: '#0F172A' },
  container: { padding: 16, paddingBottom: 100 },
  badgeRow: { marginBottom: 12 },
  shieldBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  shieldBadgeText: { fontSize: 11, fontWeight: '800', color: '#4F46E5' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDark: { backgroundColor: '#1E293B', borderColor: '#334155' },
  greetingHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greetingIcon: { fontSize: 32 },
  greetingText: { fontSize: 20, fontWeight: '900', color: '#1E1B4B' },
  subText: { fontSize: 12, color: '#64748B', fontWeight: '500', marginTop: 2 },
  boldText: { fontWeight: '800', color: '#4F46E5' },
  heroCard: { backgroundColor: '#FFFFFF' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
  activeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  studentName: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  sectionBadge: { fontSize: 12, fontWeight: '700', color: '#4F46E5', marginTop: 2 },
  rfidText: { fontSize: 11, color: '#64748B', fontFamily: 'monospace', marginTop: 2 },
  statusBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  statusLabelTitle: { fontSize: 11, color: '#64748B', fontWeight: '700', marginBottom: 6 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  pillGreen: { backgroundColor: '#D1FAE5' },
  pillBlue: { backgroundColor: '#DBEAFE' },
  pillAmber: { backgroundColor: '#FEF3C7' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotGreen: { backgroundColor: '#10B981' },
  dotBlue: { backgroundColor: '#3B82F6' },
  dotAmber: { backgroundColor: '#F59E0B' },
  statusPillText: { fontSize: 12, fontWeight: '900' },
  textGreen: { color: '#065F46' },
  textBlue: { color: '#1E40AF' },
  textAmber: { color: '#92400E' },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statBoxDark: { backgroundColor: '#0F172A', borderColor: '#334155' },
  statLabel: { fontSize: 9, fontWeight: '800', color: '#64748B' },
  statValue: { fontSize: 13, fontWeight: '900', color: '#0F172A', marginVertical: 2 },
  statTagGreen: { fontSize: 10, fontWeight: '800', color: '#10B981' },
  statTagMuted: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  statTagPrimary: { fontSize: 10, fontWeight: '800', color: '#4F46E5' },
  actionRow: { flexDirection: 'row', gap: 10 },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  btnSecondaryDark: { backgroundColor: '#334155', borderColor: '#475569' },
  btnSecondaryText: { color: '#0F172A', fontSize: 13, fontWeight: '800' },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 8,
  },
  timelineItemDark: { backgroundColor: '#0F172A' },
  timelineLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timelineIcon: { fontSize: 16 },
  timelineLocation: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  timelineReader: { fontSize: 10, color: '#64748B', fontFamily: 'monospace' },
  timelineTime: { fontSize: 12, fontWeight: '800', color: '#4F46E5' },
  timelineAction: { fontSize: 10, fontWeight: '700', color: '#10B981' },
  guardianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    marginBottom: 8,
  },
  guardianRowDark: { backgroundColor: '#0F172A' },
  guardianAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guardianAvatarText: { color: '#4F46E5', fontSize: 16, fontWeight: '900' },
  guardianName: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  guardianRelation: { fontSize: 11, color: '#10B981', fontWeight: '700' },
  callBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  callBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  textWhite: { color: '#FFFFFF' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  modalSlot: {
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 8,
  },
  modalSlotTime: { fontSize: 11, fontWeight: '800', color: '#4F46E5' },
  modalSlotTitle: { fontSize: 12, fontWeight: '700', color: '#0F172A', marginTop: 2 },
  noticeBox: {
    padding: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  noticeTitle: { fontSize: 13, fontWeight: '800', color: '#065F46' },
  noticeBody: { fontSize: 12, color: '#047857', marginTop: 4 },
});
