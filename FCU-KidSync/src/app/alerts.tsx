import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, CheckCircle2, MapPin, UserCheck, BookOpen } from 'lucide-react-native';

import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AlertsScreen() {
  const { child, attendance, themeMode, toggleTheme } = useAuth();
  const isDark = themeMode === 'dark';

  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [readState, setReadState] = useState<Record<string, boolean>>({});

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
  const timeInFormatted = formatTime12h(attendance?.time_in || '07:48:00');
  const timeOutFormatted = attendance?.time_out ? formatTime12h(attendance.time_out) : null;

  const alerts = [
    {
      id: 'alt-1',
      category: 'Arrival',
      iconType: 'arrival',
      title: `${child.name} • Morning Arrival Logged`,
      desc: `${child.name} arrived at school and scanned active RFID tag at Main Entrance Gate.`,
      time: `Today • ${timeInFormatted}`,
    },
    {
      id: 'alt-2',
      category: 'Movement',
      iconType: 'movement',
      title: `${child.name} • Classroom Checkpoint Verified`,
      desc: `${child.name} checked into Classroom Alpha (Room 102) for morning learning circle.`,
      time: 'Today • 08:00 AM',
    },
    {
      id: 'alt-3',
      category: 'Movement',
      iconType: 'movement',
      title: `${child.name} • Playground Checkpoint Scan`,
      desc: `${child.name} transitioned to Kindergarten Activity Area under teacher supervision.`,
      time: 'Today • 09:45 AM',
    },
    ...(isCheckedOut && timeOutFormatted
      ? [
          {
            id: 'alt-4',
            category: 'Pickup',
            iconType: 'pickup',
            title: `${child.name} • Safe Dismissal & Pickup Completed`,
            desc: `${child.name} was safely released at campus exit gate (${attendance?.verified_by || 'Verified RFID Gate'}).`,
            time: `Today • ${timeOutFormatted}`,
          },
        ]
      : [
          {
            id: 'alt-4',
            category: 'Pickup',
            iconType: 'pickup',
            title: `${child.name} • In Classroom - Awaiting Pickup`,
            desc: `${child.name} has completed class activities and is in Classroom Alpha awaiting authorized pickup.`,
            time: 'Today • 11:30 AM',
          },
        ]),
    {
      id: 'alt-5',
      category: 'Updates',
      iconType: 'update',
      title: `${child.name} • Teacher Progress Note`,
      desc: `Teacher ${child.section?.teacher?.name}: "${child.name} demonstrated active participation during phonics today!"`,
      time: 'Today • 10:15 AM',
    },
  ];

  const filteredAlerts = alerts.filter((a) => {
    if (categoryFilter === 'All') return true;
    return a.category === categoryFilter;
  });

  const markAllRead = () => {
    const next: Record<string, boolean> = {};
    alerts.forEach((a) => (next[a.id] = true));
    setReadState(next);
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'arrival':
        return <CheckCircle2 size={20} color="#10B981" />;
      case 'movement':
        return <MapPin size={20} color="#3B82F6" />;
      case 'pickup':
        return <UserCheck size={20} color="#8B5CF6" />;
      default:
        return <BookOpen size={20} color="#F59E0B" />;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, isDark ? styles.safeAreaDark : styles.safeAreaLight]}>
      {/* Official Header */}
      <Header themeMode={themeMode} onToggleTheme={toggleTheme} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, isDark ? styles.textWhite : styles.textDark]}>Notifications</Text>
            <Text style={[styles.subText, isDark ? styles.textSubDark : styles.textSubLight]}>
              Safety alerts & updates for {child.name}
            </Text>
          </View>

          <Button variant="ghost" size="sm" isDark={isDark} onPress={markAllRead}>
            Mark All Read
          </Button>
        </View>

        {/* Category Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {['All', 'Arrival', 'Movement', 'Pickup', 'Updates'].map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? 'default' : 'secondary'}
              size="sm"
              isDark={isDark}
              style={{ marginRight: 8 }}
              onPress={() => setCategoryFilter(cat)}
            >
              {cat}
            </Button>
          ))}
        </ScrollView>

        {/* Alert List */}
        <View style={{ gap: 10 }}>
          {filteredAlerts.map((item) => {
            const isRead = readState[item.id];
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setReadState((prev) => ({ ...prev, [item.id]: true }))}
                activeOpacity={0.8}
              >
                <Card
                  isDark={isDark}
                  style={[
                    styles.alertCard,
                    !isRead && (isDark ? styles.unreadCardDark : styles.unreadCardLight),
                  ]}
                >
                  <View style={styles.alertRow}>
                    <View style={[styles.iconBox, isDark ? styles.iconBoxDark : styles.iconBoxLight]}>
                      {renderIcon(item.iconType)}
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.alertTitleRow}>
                        <Badge variant="info" isDark={isDark}>
                          {item.category}
                        </Badge>
                        <Text style={[styles.alertTime, isDark ? styles.textSubDark : styles.textSubLight]}>
                          {item.time}
                        </Text>
                      </View>

                      <Text style={[styles.alertTitle, isDark ? styles.textWhite : styles.textDark]}>
                        {item.title}
                      </Text>
                      <Text style={[styles.alertDesc, isDark ? styles.textSubDark : styles.textSubLight]}>
                        {item.desc}
                      </Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  safeAreaLight: { backgroundColor: '#F8FAFC' },
  safeAreaDark: { backgroundColor: '#0F172A' },
  container: { padding: 16, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900' },
  subText: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  textDark: { color: '#0F172A' },
  textWhite: { color: '#FFFFFF' },
  textSubLight: { color: '#64748B' },
  textSubDark: { color: '#94A3B8' },
  alertCard: { marginBottom: 0 },
  unreadCardLight: { borderColor: '#A5B4FC', backgroundColor: '#F4F5FF' },
  unreadCardDark: { borderColor: '#6366F1', backgroundColor: '#1E1B4B' },
  alertRow: { flexDirection: 'row', gap: 12 },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxLight: { backgroundColor: '#F1F5F9' },
  iconBoxDark: { backgroundColor: '#0F172A' },
  alertTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  alertTime: { fontSize: 10, fontWeight: '700' },
  alertTitle: { fontSize: 13, fontWeight: '900', marginTop: 4 },
  alertDesc: { fontSize: 12, marginTop: 2, lineHeight: 18 },
});
