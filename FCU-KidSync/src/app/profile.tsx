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
import { Phone, Mail, ShieldCheck, LogOut, Building2 } from 'lucide-react-native';

import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

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
        <View style={styles.segmentContainer}>
          <Button
            variant={activeTab === 'parent' ? 'default' : 'secondary'}
            size="md"
            isDark={isDark}
            style={{ flex: 1 }}
            onPress={() => setActiveTab('parent')}
          >
            Parent & Guardians
          </Button>

          <Button
            variant={activeTab === 'child' ? 'default' : 'secondary'}
            size="md"
            isDark={isDark}
            style={{ flex: 1 }}
            onPress={() => setActiveTab('child')}
          >
            Child Profile
          </Button>
        </View>

        {activeTab === 'parent' && (
          <View style={{ gap: 16 }}>
            {/* Primary Account Box */}
            <Card isDark={isDark}>
              <View style={styles.parentHeader}>
                <Avatar size={50} fallbackText={parentName} isDark={isDark} />
                <View>
                  <Text style={[styles.parentName, isDark ? styles.textWhite : styles.textDark]}>{parentName}</Text>
                  <Badge variant="info" isDark={isDark} style={{ marginTop: 2 }}>
                    Primary Guardian Account
                  </Badge>
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

              <Alert variant="success" isDark={isDark} style={{ marginTop: 8, marginBottom: 0 }}>
                <AlertTitle isDark={isDark}>✓ Authorized for Dismissal Pickup</AlertTitle>
                <AlertDescription isDark={isDark}>
                  Registered as verified primary contact for gate checkouts.
                </AlertDescription>
              </Alert>
            </Card>

            {/* Connected Guardians Box */}
            <Card isDark={isDark}>
              <CardHeader>
                <CardTitle isDark={isDark}>Registered Guardians</CardTitle>
                <CardDescription isDark={isDark}>Connected emergency contacts for {child.name}</CardDescription>
              </CardHeader>

              <View style={{ gap: 10 }}>
                {child.guardians.map((g, idx) => (
                  <View key={idx} style={[styles.gCard, isDark ? styles.gCardDark : styles.gCardLight]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Avatar size={34} fallbackText={g.name} isDark={isDark} />
                      <View>
                        <Text style={[styles.gName, isDark ? styles.textWhite : styles.textDark]}>{g.name}</Text>
                        <Badge variant="success" isDark={isDark} style={{ marginTop: 2 }}>
                          {g.relation}
                        </Badge>
                      </View>
                    </View>
                    <Text style={styles.gPhone}>📞 {g.phone}</Text>
                  </View>
                ))}
              </View>
            </Card>

            <Button variant="destructive" size="lg" onPress={logout}>
              Log Out Account
            </Button>
          </View>
        )}

        {activeTab === 'child' && (
          <View style={{ gap: 16 }}>
            {/* Student Info Card */}
            <Card isDark={isDark}>
              <View style={styles.parentHeader}>
                <Avatar size={50} fallbackText={child.name} isDark={isDark} />
                <View>
                  <Text style={[styles.parentName, isDark ? styles.textWhite : styles.textDark]}>{child.name}</Text>
                  <Badge variant="info" isDark={isDark} style={{ marginTop: 2 }}>
                    Official Student Record
                  </Badge>
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
                <Button
                  variant="default"
                  size="sm"
                  style={{ marginTop: 8 }}
                  onPress={() => Linking.openURL(`mailto:${child.section?.teacher?.email || 'teacher@fcu.edu'}`)}
                >
                  Email Teacher
                </Button>
              </View>
            </Card>

            {/* School Campus Info */}
            <Card isDark={isDark}>
              <CardHeader>
                <CardTitle isDark={isDark}>Filamer Christian University</CardTitle>
                <CardDescription isDark={isDark}>Kindergarten Department Details</CardDescription>
              </CardHeader>

              <View style={{ gap: 10 }}>
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
            </Card>
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
  segmentContainer: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  parentHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  parentName: { fontSize: 18, fontWeight: '900' },
  infoDivider: { height: 1, marginVertical: 14 },
  infoDividerLight: { backgroundColor: '#E2E8F0' },
  infoDividerDark: { backgroundColor: '#334155' },
  infoRow: { marginBottom: 10 },
  infoLabel: { fontSize: 9, fontWeight: '800' },
  infoVal: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  subText: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  textDark: { color: '#0F172A' },
  textWhite: { color: '#FFFFFF' },
  textSubLight: { color: '#64748B' },
  textSubDark: { color: '#94A3B8' },
  gCard: { padding: 12, borderRadius: 14, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gCardLight: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  gCardDark: { backgroundColor: '#0F172A', borderColor: '#334155' },
  gName: { fontSize: 13, fontWeight: '800' },
  gPhone: { fontSize: 11, fontWeight: '700', color: '#4F46E5' },
  gridRow: { flexDirection: 'row', gap: 10 },
  gridBox: { flex: 1, padding: 10, borderRadius: 12, borderWidth: 1 },
  gridVal: { fontSize: 13, fontWeight: '900', marginTop: 4 },
  adviserBox: { padding: 12, borderRadius: 14, marginTop: 12, borderWidth: 1 },
  adviserBoxLight: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  adviserBoxDark: { backgroundColor: '#1E1B4B', borderColor: '#3730A3' },
  adviserHeader: { fontSize: 9, fontWeight: '900', color: '#6366F1' },
  adviserName: { fontSize: 14, fontWeight: '900', color: '#818CF8', marginTop: 2 },
  adviserTitle: { fontSize: 11, color: '#A5B4FC', fontWeight: '600' },
});
