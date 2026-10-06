import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, useColorScheme } from 'react-native';

interface HeaderProps {
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ themeMode, onToggleTheme }) => {
  const isDark = themeMode === 'dark';

  return (
    <View style={[styles.headerContainer, isDark ? styles.headerDark : styles.headerLight]}>
      <View style={styles.brandContainer}>
        <Image
          source={require('@/assets/images/Filamer_Logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.textContainer}>
          <Text style={[styles.title, isDark ? styles.titleDark : styles.titleLight]}>
            FCU Kindergarten
          </Text>
          <Text style={[styles.subtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}>
            RFID MONITORING SYSTEM
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.themeBtn, isDark ? styles.themeBtnDark : styles.themeBtnLight]}
        onPress={onToggleTheme}
        activeOpacity={0.7}
        accessibilityLabel="Toggle Theme Mode"
      >
        <Text style={styles.themeBtnIcon}>{isDark ? '🌙' : '☀️'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLight: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E2E8F0',
  },
  headerDark: {
    backgroundColor: '#1E293B',
    borderBottomColor: '#334155',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  logo: {
    width: 44,
    height: 44,
  },
  textContainer: {
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  titleLight: {
    color: '#0B2545',
  },
  titleDark: {
    color: '#818CF8',
  },
  subtitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 1,
  },
  subtitleLight: {
    color: '#64748B',
  },
  subtitleDark: {
    color: '#94A3B8',
  },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  themeBtnLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  themeBtnDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  themeBtnIcon: {
    fontSize: 16,
  },
});
