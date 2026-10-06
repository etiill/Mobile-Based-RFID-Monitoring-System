import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user, child, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'parent' | 'child'>('parent');

  const parentName = user?.name || 'Sarah Johnson';
  const parentEmail = user?.email || 'sarah@fcu.edu';
  const parentPhone = user?.phone || '0917 555 0101';

  return (
    <SafeAreaView style={[styles.safeArea, isDark && styles.safeAreaDark]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Profile Switcher Segment */}
        <View style={[styles.segmentContainer, isDark && styles.cardDark]}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'parent' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('parent')}
          >
            <Text style={[styles.segmentText, activeTab === 'parent' && styles.textWhite]}>
              Parent & Guardians
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'child' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('child')}
          >
            <Text style={[styles.segmentText, activeTab === 'child' && styles.textWhite]}>
              Child Profile
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'parent' && (
          <View style={{ gap: 16 }}>
            {/* Primary Account Box */}
            <View style={[styles.card, isDark && styles.cardDark]}>
              <View style={styles.parentHeader}>
                <View style={styles.avatarBox}>
                  <Text style={styles.avatarBoxText}>{parentName.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={[styles.parentName, isDark && styles.textWhite]}>{parentName}</Text>
                  <Text style={styles.primaryBadge}>Primary Guardian Account</Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>EMAIL ADDRESS</Text>
                <Text style={[styles.infoVal, isDark && styles.textWhite]}>{parentEmail}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>MOBILE PHONE</Text>
                <Text style={[styles.infoVal, isDark && styles.textWhite]}>{parentPhone}</Text>
              </View>

              <View style={styles.authBadge}>
                <Text style={styles.authBadgeText}>✓ Authorized for Student Dismissal Pickup</Text>
              </View>
            </View>

            {/* Connected Guardians Box */}
            <View style={[styles.card, isDark && styles.cardDark]}>
              <Text style={[styles.cardTitle, isDark && styles.textWhite]}>Registered Guardians</Text>
              <Text style={styles.subText}>Connected emergency contacts for {child.name}</Text>

              <View style={{ marginTop: 12, gap: 10 }}>
                {child.guardians.map((g, idx) => (
                  <View key={idx} style={[styles.gCard, isDark && styles.gCardDark]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={styles.gAvatar}>
                        <Text style={styles.gAvatarText}>{g.name.charAt(0)}</Text>
                      </View>
                      <View>
                        <Text style={[styles.gName, isDark && styles.textWhite]}>{g.name}</Text>
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
            <View style={[styles.card, isDark && styles.cardDark]}>
              <View style={styles.parentHeader}>
                <View style={[styles.avatarBox, { backgroundColor: '#4F46E5' }]}>
                  <Text style={[styles.avatarBoxText, { color: '#FFFFFF' }]}>{child.name.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={[styles.parentName, isDark && styles.textWhite]}>{child.name}</Text>
                  <Text style={styles.primaryBadge}>Official Student Record</Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.gridRow}>
                <View style={[styles.gridBox, isDark && styles.gCardDark]}>
                  <Text style={styles.infoLabel}>GRADE & SECTION</Text>
                  <Text style={[styles.gridVal, isDark && styles.textWhite]}>
                    {child.section ? `${child.section.year_level} - ${child.section.section_name}` : 'Kindergarten - Alpha'}
                  </Text>
                </View>

                <View style={[styles.gridBox, isDark && styles.gCardDark]}>
                  <Text style={styles.infoLabel}>STUDENT ID</Text>
                  <Text style={[styles.gridVal, isDark && styles.textWhite]}>STU-2026-0001</Text>
                </View>
              </View>

              <View style={[styles.gridBox, isDark && styles.gCardDark, { marginTop: 10 }]}>
                <Text style={styles.infoLabel}>SPECIFIC RFID TAG SERIAL</Text>
                <Text style={[styles.gridVal, { color: '#10B981', fontFamily: 'monospace' }]}>
                  {child.rfid} (Tag Active)
                </Text>
                <Text style={styles.subText}>Contactless 13.56MHz High-Frequency Security Tag</Text>
              </View>

              {/* Adviser Info */}
              <View style={styles.adviserBox}>
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
            <View style={[styles.card, isDark && styles.cardDark]}>
              <Text style={[styles.cardTitle, isDark && styles.textWhite]}>Filamer Christian University</Text>
              <Text style={styles.subText}>Kindergarten Department Details</Text>

              <View style={{ marginTop: 12, gap: 10 }}>
                <View>
                  <Text style={styles.infoLabel}>CAMPUS ADDRESS</Text>
                  <Text style={[styles.infoVal, isDark && styles.textWhite]}>Roxas Avenue, Roxas City, Capiz 5800</Text>
                </View>
                <View>
                  <Text style={styles.infoLabel}>EMERGENCY HOTLINE</Text>
                  <Text style={[styles.infoVal, isDark && styles.textWhite]}>(036) 621-1234 • Mobile: 0917 555 0199</Text>
                </View>
                <View>
                  <Text style={styles.infoLabel}>OPERATING HOURS</Text>
                  <Text style={[styles.infoVal, isDark && styles.textWhite]}>Monday – Friday: 7:00 AM – 4:30 PM</Text>
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
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  safeAreaDark: { backgroundColor: '#0F172A' },
  container: { padding: 16, paddingBottom: 100 },
  segmentContainer: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#4F46E5' },
  segmentText: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  cardDark: { backgroundColor: '#1E293B', borderColor: '#334155' },
  parentHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  avatarBoxText: { color: '#4F46E5', fontSize: 22, fontWeight: '900' },
  parentName: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  primaryBadge: { fontSize: 11, fontWeight: '700', color: '#4F46E5', marginTop: 2 },
  infoDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 14 },
  infoRow: { marginBottom: 10 },
  infoLabel: { fontSize: 9, fontWeight: '800', color: '#64748B' },
  infoVal: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 2 },
  authBadge: { backgroundColor: '#ECFDF5', padding: 10, borderRadius: 12, marginTop: 6, borderWidth: 1, borderColor: '#A7F3D0' },
  authBadgeText: { fontSize: 11, fontWeight: '800', color: '#065F46' },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  subText: { fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 2 },
  gCard: { padding: 12, backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gCardDark: { backgroundColor: '#0F172A', borderColor: '#334155' },
  gAvatar: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center' },
  gAvatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  gName: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  gRel: { fontSize: 10, fontWeight: '700', color: '#10B981' },
  gPhone: { fontSize: 11, fontWeight: '700', color: '#4F46E5' },
  logoutBtn: { backgroundColor: '#FEE2E2', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  logoutBtnText: { color: '#991B1B', fontSize: 13, fontWeight: '900' },
  gridRow: { flexDirection: 'row', gap: 10 },
  gridBox: { flex: 1, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  gridVal: { fontSize: 13, fontWeight: '900', color: '#0F172A', marginTop: 4 },
  adviserBox: { backgroundColor: '#EFF6FF', padding: 12, borderRadius: 14, marginTop: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  adviserHeader: { fontSize: 9, fontWeight: '900', color: '#1E40AF' },
  adviserName: { fontSize: 14, fontWeight: '900', color: '#1E3A8A', marginTop: 2 },
  adviserTitle: { fontSize: 11, color: '#2563EB', fontWeight: '600' },
  emailBtn: { backgroundColor: '#2563EB', paddingVertical: 8, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  emailBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  textWhite: { color: '#FFFFFF' },
});
