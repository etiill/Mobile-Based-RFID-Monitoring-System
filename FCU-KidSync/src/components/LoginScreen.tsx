import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, LogIn, ShieldCheck, Sun, Moon, Info } from 'lucide-react-native';

import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export function LoginScreen() {
  const { login, isLoading, themeMode, toggleTheme } = useAuth();
  const isDark = themeMode === 'dark';

  const [email, setEmail] = useState('sarah@fcu.edu');
  const [password, setPassword] = useState('password123');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    setErrorMsg('');
    try {
      await login(email, password);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Login failed. Please check credentials.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, isDark ? styles.bgDark : styles.bgLight]}>
      {/* Theme Toggle Top Right */}
      <View style={styles.topBar}>
        <View style={styles.badgeGroup}>
          <Badge variant="info" isDark={isDark}>
            FCU RFID v2.0
          </Badge>
        </View>
        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.themeBtn, isDark ? styles.themeBtnDark : styles.themeBtnLight]}
        >
          {isDark ? <Sun size={18} color="#F59E0B" /> : <Moon size={18} color="#475569" />}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Branding */}
          <View style={styles.brandContainer}>
            <View style={[styles.logoWrap, isDark ? styles.logoWrapDark : styles.logoWrapLight]}>
              <Image
                source={require('@/assets/images/Filamer_Logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <Text style={[styles.title, isDark ? styles.textWhite : styles.textDark]}>
              Filamer Christian University
            </Text>
            <Text style={styles.subtitle}>KINDERGARTEN RFID MONITORING SYSTEM</Text>
          </View>

          {/* Login Card */}
          <Card isDark={isDark} style={styles.card}>
            <CardHeader>
              <CardTitle isDark={isDark} style={styles.cardTitle}>
                Parent & Guardian Sign In
              </CardTitle>
              <CardDescription isDark={isDark}>
                Sign in to view real-time student check-in, check-out, and RFID movement alerts.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {errorMsg ? (
                <Alert variant="destructive" isDark={isDark} style={{ marginBottom: 12 }}>
                  <AlertTitle isDark={isDark}>Authentication Error</AlertTitle>
                  <AlertDescription isDark={isDark}>{errorMsg}</AlertDescription>
                </Alert>
              ) : null}

              <Input
                label="Email Address"
                placeholder="e.g. sarah@fcu.edu"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                isDark={isDark}
              />

              <Input
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                isDark={isDark}
              />

              <Button
                variant="rose"
                size="lg"
                isLoading={isLoading}
                onPress={handleLogin}
                style={{ marginTop: 8 }}
              >
                Sign In to Dashboard
              </Button>
            </CardContent>

            <CardFooter style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              {/* Quick Demo Credentials Tip */}
              <Alert variant="info" isDark={isDark}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Info size={14} color={isDark ? '#93C5FD' : '#1E40AF'} style={{ marginRight: 6 }} />
                  <AlertTitle isDark={isDark}>Demo Credentials</AlertTitle>
                </View>
                <AlertDescription isDark={isDark}>
                  Use <Text style={{ fontWeight: '800' }}>sarah@fcu.edu</Text> (Parent) or any school email to access your child's live monitoring records.
                </AlertDescription>
              </Alert>
            </CardFooter>
          </Card>

          {/* Footer Security Badge */}
          <View style={styles.securityFooter}>
            <ShieldCheck size={16} color="#10B981" />
            <Text style={[styles.securityText, isDark ? styles.textSubDark : styles.textSubLight]}>
              Encrypted RFID Gate Protection • FCU Security Policy
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  bgLight: { backgroundColor: '#F8FAFC' },
  bgDark: { backgroundColor: '#0F172A' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  badgeGroup: { flexDirection: 'row', alignItems: 'center' },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  themeBtnLight: { backgroundColor: '#FFFFFF', borderColor: '#CBD5E1' },
  themeBtnDark: { backgroundColor: '#1E293B', borderColor: '#475569' },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  logoWrapLight: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' },
  logoWrapDark: { backgroundColor: '#1E293B', borderColor: '#334155' },
  logoImage: { width: 60, height: 60 },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E11D48',
    letterSpacing: 0.5,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 440,
  },
  cardTitle: {
    fontSize: 18,
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 6,
  },
  securityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  textDark: { color: '#0F172A' },
  textWhite: { color: '#FFFFFF' },
  textSubLight: { color: '#64748B' },
  textSubDark: { color: '#94A3B8' },
});
