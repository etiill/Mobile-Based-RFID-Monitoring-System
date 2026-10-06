import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';

export default function ProfileScreen() {
  const { user, child, logout, themeMode, toggleTheme } = useAuth();
  const isDark = themeMode === 'dark';

  const [activeTab, setActiveTab] = useState<'parent' | 'child'>('parent');

  const parentName = user?.name || 'Sarah Johnson';
  const parentEmail = user?.email || 'sarah@fcu.edu';
  const parentPhone = user?.phone || '0917 555 0101';

  return (
    <SafeAreaView style={[styles.safeArea, isDark ? styles.safeAreaDark : styles.safeAreaLight]}>
      {/* Official Header */}
      <Header themeMode={themeMode} onToggleTheme={toggleTheme} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Profile Switcher Segment */}
        <View style={[styles.segmentContainer, isDark ? styles.cardDark : styles.cardLight]}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'parent' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('parent')}
          >
            <Text style={[styles.segmentText, activeTab === 'parent' ? styles.textWhite : isDark ? styles.textSubDark : styles.textSubLight]}>
              Parent & Guardians
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'child' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('child')}
          >
            <Text style={[styles.segmentText, activeTab === 'child' ? styles.textWhite : isDark ? styles.textSubDark : styles.textSubLight]}>
              Child Profile
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'parent' && (
          <View style={{ gap: 16 }}>
            {/* Primary Account Box */}
            <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
              <View style={styles.parentHeader}>
                <View style={[styles.avatarBox, isDark ? styles.avatarBoxDark : styles.avatarBoxLight]}>
                  <Text style={styles.avatarBoxText}>{parentName.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={[styles.parentName, isDark ? styles.textWhite : styles.textDark]}>{parentName}</Text>
                  <Text style={styles.primaryBadge}>Primary Guardian Account</Text>
                </View>
              </View>

              <View style={[styles.infoDivider, isDark ? styles.infoDividerDark : styles.infoDividerLight]} />

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, isDark ? styles.textSubDark : styles.textSubLight]}>EMAIL ADDRESS</Text>
                <Text style={[styles.infoVal, isDark ? styles.textWhite : styles.textDark]}>{parentEmail}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, isDark ? styles.textSubDark : styles.textSubLight]}>MOBILE PHONE</Text>
                <Text style={[styles.infoVal, isDark ? styles.textWhite : styles.textDark]}>{parentPhone}</Text>
              </View>

              <View style={[styles.authBadge, isDark ? styles.authBadgeDark : styles.authBadgeLight]}>
                <Text style={styles.authBadgeText}>✓ Authorized for Student Dismissal Pickup</Text>
              </View>
            </View>

            {/* Connected Guardians Box */}
            <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
              <Text style={[styles.cardTitle, isDark ? styles.textWhite : styles.textDark]}>Registered Guardians</Text>
              <Text style={[styles.subText, isDark ? styles.textSubDark : styles.textSubLight]}>
                Connected emergency contacts for {child.name}
              </Text>

              <View style={{ marginTop: 12, gap: 10 }}>
                {child.guardians.map((g, idx) => (
                  <View key={idx} style={[styles.gCard, isDark ? styles.gCardDark : styles.gCardLight]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={styles.gAvatar}>
                        <Text style={styles.gAvatarText}>{g.name.charAt(0)}</Text>
                      </View>
                      <View>
                        <Text style={[styles.gName, isDark ? styles.textWhite : styles.textDark]}>{g.name}</Text>
                        <Text style={styles.gRel}>{g.relation}</Text>
                      </View>
                    </View>
                    <Text style={styles.gPhone}>📞 {g.phone}</Text>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Text style={styles.logoutBtnText}>Log Out Account</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'child' && (
          <View style={{ gap: 16 }}>
            {/* Student Info Card */}
            <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
              <View style={styles.parentHeader}>
                <View style={[styles.avatarBox, { backgroundColor: '#4F46E5' }]}>
                  <Text style={[styles.avatarBoxText, { color: '#FFFFFF' }]}>{child.name.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={[styles.parentName, isDark ? styles.textWhite : styles.textDark]}>{child.name}</Text>
                  <Text style={styles.primaryBadge}>Official Student Record</Text>
                </View>
              </View>

              <View style={[styles.infoDivider, isDark ? styles.infoDividerDark : styles.infoDividerLight]} />

              <View style={styles.gridRow}>
                <View style={[styles.gridBox, isDark ? styles.gCardDark : styles.gCardLight]}>
                  <Text style={[styles.infoLabel, isDark ? styles.textSubDark : styles.textSubLight]}>GRADE & SECTION</Text>
                  <Text style={[styles.gridVal, isDark ? styles.textWhite : styles.textDark]}>
                    {child.section ? `${child.section.year_level} - ${child.section.section_name}` : 'Kindergarten - Alpha'}
                  </Text>
                </View>

                <View style={[styles.gridBox, isDark ? styles.gCardDark : styles.gCardLight]}>
                  <Text style={[styles.infoLabel, isDark ? styles.textSubDark : styles.textSubLight]}>STUDENT ID</Text>
                  <Text style={[styles.gridVal, isDark ? styles.textWhite : styles.textDark]}>STU-2026-0001</Text>
                </View>
              </View>

              <View style={[styles.gridBox, isDark ? styles.gCardDark : styles.gCardLight, { marginTop: 10 }]}>
                <Text style={[styles.infoLabel, isDark ? styles.textSubDark : styles.textSubLight]}>SPECIFIC RFID TAG SERIAL</Text>
                <Text style={[styles.gridVal, { color: '#10B981', fontFamily: 'monospace' }]}>
                  {child.rfid} (Tag Active)
                </Text>
                <Text style={[styles.subText, isDark ? styles.textSubDark : styles.textSubLight]}>Contactless 13.56MHz High-Frequency Security Tag</Text>
              </View>

              {/* Adviser Info */}
              <View style={[styles.adviserBox, isDark ? styles.adviserBoxDark : styles.adviserBoxLight]}>
                <Text style={styles.adviserHeader}>CLASS ADVISER</Text>
                <Text style={styles.adviserName}>{child.section?.teacher?.name || 'Ana Maria Reyes'}</Text>
                <Text style={styles.adviserTitle}>{child.section?.teacher?.title || 'Kindergarten Lead Adviser'}</Text>
                <TouchableOpacity
                  style={styles.emailBtn}
                  onPress={() => Linking.openURL(`mailto:${child.section?.teacher?.email || 'teacher@fcu.edu'}`)}
                >
                  <Text style={styles.emailBtnText}>📧 Email Teacher</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* School Campus Info */}
            <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
              <Text style={[styles.cardTitle, isDark ? styles.textWhite : styles.textDark]}>Filamer Christian University</Text>
              <Text style={[styles.subText, isDark ? styles.textSubDark : styles.textSubLight]}>Kindergarten Department Details</Text>

              <View style={{ marginTop: 12, gap: 10 }}>
                <View>
                  <Text style={[styles.infoLabel, isDark ? styles.textSubDark : styles.textSubLight]}>CAMPUS ADDRESS</Text>
                  <Text style={[styles.infoVal, isDark ? styles.textWhite : styles.textDark]}>Roxas Avenue, Roxas City, Capiz 5800</Text>
                </View>
                <View>
                  <Text style={[styles.infoLabel, isDark ? styles.textSubDark : styles.textSubLight]}>EMERGENCY HOTLINE</Text>
                  <Text style={[styles.infoVal, isDark ? styles.textWhite : styles.textDark]}>(036) 621-1234 • Mobile: 0917 555 0199</Text>
                </View>
                <View>
                  <Text style={[styles.infoLabel, isDark ? styles.textSubDark : styles.textSubLight]}>OPERATING HOURS</Text>
                  <Text style={[styles.infoVal, isDark ? styles.textWhite : styles.textDark]}>Monday – Friday: 7:00 AM – 4:30 PM</Text>
                </View>
              </View>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  safeAreaLight: { backgroundColor: '#F8FAFC' },
  safeAreaDark: { backgroundColor: '#0F172A' },
  container: { padding: 16, paddingBottom: 100 },
  segmentContainer: { flexDirection: 'row', borderRadius: 16, padding: 4, marginBottom: 16, borderWidth: 1 },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#4F46E5' },
  segmentText: { fontSize: 12, fontWeight: '800' },
  card: { borderRadius: 20, padding: 16, borderWidth: 1 },
  cardLight: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' },
  cardDark: { backgroundColor: '#1E293B', borderColor: '#334155' },
  parentHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  avatarBoxLight: { backgroundColor: '#EEF2FF' },
  avatarBoxDark: { backgroundColor: '#312E81' },
  avatarBoxText: { color: '#4F46E5', fontSize: 22, fontWeight: '900' },
  parentName: { fontSize: 18, fontWeight: '900' },
  primaryBadge: { fontSize: 11, fontWeight: '700', color: '#4F46E5', marginTop: 2 },
  infoDivider: { height: 1, marginVertical: 14 },
  infoDividerLight: { backgroundColor: '#E2E8F0' },
  infoDividerDark: { backgroundColor: '#334155' },
  infoRow: { marginBottom: 10 },
  infoLabel: { fontSize: 9, fontWeight: '800' },
  infoVal: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  authBadge: { padding: 10, borderRadius: 12, marginTop: 6, borderWidth: 1 },
  authBadgeLight: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  authBadgeDark: { backgroundColor: '#064E3B', borderColor: '#047857' },
  authBadgeText: { fontSize: 11, fontWeight: '800', color: '#10B981' },
  cardTitle: { fontSize: 16, fontWeight: '900' },
  subText: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  textDark: { color: '#0F172A' },
  textWhite: { color: '#FFFFFF' },
  textSubLight: { color: '#64748B' },
  textSubDark: { color: '#94A3B8' },
  gCard: { padding: 12, borderRadius: 14, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gCardLight: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  gCardDark: { backgroundColor: '#0F172A', borderColor: '#334155' },
  gAvatar: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center' },
  gAvatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  gName: { fontSize: 13, fontWeight: '800' },
  gRel: { fontSize: 10, fontWeight: '700', color: '#10B981' },
  gPhone: { fontSize: 11, fontWeight: '700', color: '#4F46E5' },
  logoutBtn: { backgroundColor: '#FEE2E2', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  logoutBtnText: { color: '#991B1B', fontSize: 13, fontWeight: '900' },
  gridRow: { flexDirection: 'row', gap: 10 },
  gridBox: { flex: 1, padding: 10, borderRadius: 12, borderWidth: 1 },
  gridVal: { fontSize: 13, fontWeight: '900', marginTop: 4 },
  adviserBox: { padding: 12, borderRadius: 14, marginTop: 12, borderWidth: 1 },
  adviserBoxLight: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  adviserBoxDark: { backgroundColor: '#1E1B4B', borderColor: '#3730A3' },
  adviserHeader: { fontSize: 9, fontWeight: '900', color: '#6366F1' },
  adviserName: { fontSize: 14, fontWeight: '900', color: '#818CF8', marginTop: 2 },
  adviserTitle: { fontSize: 11, color: '#A5B4FC', fontWeight: '600' },
  emailBtn: { backgroundColor: '#4F46E5', paddingVertical: 8, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  emailBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
});
