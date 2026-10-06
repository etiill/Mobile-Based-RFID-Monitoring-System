import React from 'react';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, useColorScheme, View, StyleSheet } from 'react-native';
import { LayoutGrid, Radio, CalendarDays, BellRing, UserCheck } from 'lucide-react-native';

import { Spacing } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs style={{ flex: 1 }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton tab="home" label="Home" />
          </TabTrigger>

          <TabTrigger name="monitoring" href={"/monitoring" as any} asChild>
            <TabButton tab="monitoring" label="Monitoring" />
          </TabTrigger>

          <TabTrigger name="attendance" href={"/attendance" as any} asChild>
            <TabButton tab="attendance" label="Attendance" />
          </TabTrigger>

          <TabTrigger name="alerts" href={"/alerts" as any} asChild>
            <TabButton tab="alerts" label="Alerts" />
          </TabTrigger>

          <TabTrigger name="profile" href={"/profile" as any} asChild>
            <TabButton tab="profile" label="Profile" />
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

interface CustomTabButtonProps extends TabTriggerSlotProps {
  tab: 'home' | 'monitoring' | 'attendance' | 'alerts' | 'profile';
  label: string;
}

export function TabButton({ tab, label, isFocused, ...props }: CustomTabButtonProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const renderIcon = (color: string, size: number = 22) => {
    switch (tab) {
      case 'home':
        return <LayoutGrid size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
      case 'monitoring':
        return <Radio size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
      case 'attendance':
        return <CalendarDays size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
      case 'alerts':
        return <BellRing size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
      case 'profile':
        return <UserCheck size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
    }
  };

  const inactiveColor = isDark ? '#64748B' : '#94A3B8';

  return (
    <Pressable {...props} style={styles.tabPressable}>
      {isFocused ? (
        <View style={styles.activeContainer}>
          {/* Curved Notch Top Protrusion */}
          <View style={[styles.notchArch, isDark ? styles.notchArchDark : styles.notchArchLight]} />
          {/* Elevated Circular Active Bubble */}
          <View style={styles.activeBubble}>
            {renderIcon('#FFFFFF', 22)}
          </View>
        </View>
      ) : (
        <View style={styles.inactiveContainer}>
          {renderIcon(inactiveColor, 22)}
        </View>
      )}
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <View {...props} style={styles.tabListWrapper}>
      <View style={[styles.tabListBar, isDark ? styles.tabListBarDark : styles.tabListBarLight]}>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    zIndex: 99,
  },
  tabListBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 500,
    height: 64,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  tabListBarLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  tabListBarDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  tabPressable: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    top: -14,
  },
  notchArch: {
    width: 60,
    height: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: 'absolute',
    top: 6,
  },
  notchArchLight: {
    backgroundColor: 'transparent',
  },
  notchArchDark: {
    backgroundColor: 'transparent',
  },
  activeBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E11D48', // Vibrant Rose Pink accent matching reference
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E11D48',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
});
