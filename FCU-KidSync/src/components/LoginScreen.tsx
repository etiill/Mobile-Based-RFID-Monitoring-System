import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Lock, Eye, EyeOff, ArrowRight, HelpCircle, Globe, Sun, Moon, Check } from 'lucide-react-native';

import { useAuth } from '@/context/AuthContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export function LoginScreen() {
  const { login, isLoading, themeMode, toggleTheme } = useAuth();
  const isDark = themeMode === 'dark';

  const [email, setEmail] = useState('sarah@fcu.edu');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!email.trim()) {
      setErrorMsg('Please enter your ID or email.');
      return;
    }
    setErrorMsg('');
    try {
      await login(email, password);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, isDark ? styles.bgDark : styles.bgRoyalBlue]}>
      {/* Top Navigation Bar from Reference */}
      <View style={styles.topHeaderBar}>
        {/* Left Side: FCU Seal + RFID Monitoring System Title */}
        <View style={styles.headerLeft}>
          <Image
            source={require('@/assets/images/Filamer_Logo.png')}
            style={styles.topLogo}
            resizeMode="contain"
          />
          <View style={styles.topTitleGroup}>
            <Text style={styles.topTitleBrand}>RFID</Text>
            <Text style={styles.topTitleSub}>Monitoring System</Text>
          </View>
        </View>

        {/* Right Side: Support, Language, Theme Toggle */}
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerItem}
            activeOpacity={0.7}
            onPress={() => setErrorMsg('Help desk: support@fcu.edu.ph')}
          >
            <HelpCircle size={15} color="#FFFFFF" />
            <Text style={styles.headerItemText}>Support</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerItem}
            activeOpacity={0.7}
            onPress={() => setErrorMsg('Language: English (US)')}
          >
            <Globe size={15} color="#FFFFFF" />
            <Text style={styles.headerItemText}>Language</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleTheme}
            style={styles.themeToggleBtn}
            activeOpacity={0.8}
          >
            {isDark ? <Sun size={15} color="#F59E0B" /> : <Moon size={15} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Central Floating Card */}
          <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
            {/* Logo Circle */}
            <View style={styles.logoContainer}>
              <View style={[styles.logoCircle, isDark ? styles.logoCircleDark : styles.logoCircleLight]}>
                <Image
                  source={require('@/assets/images/Filamer_Logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Header Titles */}
            <Text style={[styles.title, isDark ? styles.titleDark : styles.titleLight]}>
              KINDERGARTEN MONITORING SYSTEM
            </Text>
            <Text style={[styles.subtitle, isDark ? styles.textSubDark : styles.textSubLight]}>
              SAFETY FIRST
            </Text>

            {errorMsg ? (
              <Alert variant="destructive" isDark={isDark} style={{ marginTop: 16, marginBottom: 8 }}>
                <AlertTitle isDark={isDark}>Authentication Notice</AlertTitle>
                <AlertDescription isDark={isDark}>{errorMsg}</AlertDescription>
              </Alert>
            ) : null}

            {/* Form Fields */}
            <View style={styles.formContainer}>
              {/* Email Input */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, isDark ? styles.labelDark : styles.labelLight]}>
                  Email
                </Text>
                <View style={[styles.inputBox, isDark ? styles.inputBoxDark : styles.inputBoxLight]}>
                  <User size={18} color={isDark ? '#94A3B8' : '#64748B'} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, isDark ? styles.textInputDark : styles.textInputLight]}
                    placeholder="Enter your ID or email"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.fieldLabel, isDark ? styles.labelDark : styles.labelLight]}>
                    Password
                  </Text>
                  <TouchableOpacity onPress={() => setErrorMsg('Password reset link sent to registered email.')}>
                    <Text style={[styles.forgotLink, isDark ? styles.linkDark : styles.linkLight]}>
                      Forgot?
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.inputBox, isDark ? styles.inputBoxDark : styles.inputBoxLight]}>
                  <Lock size={18} color={isDark ? '#94A3B8' : '#64748B'} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, isDark ? styles.textInputDark : styles.textInputLight]}
                    placeholder="••••••••"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                    activeOpacity={0.7}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                    ) : (
                      <Eye size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Keep me signed in Checkbox */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setKeepSignedIn(!keepSignedIn)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkbox,
                    keepSignedIn
                      ? styles.checkboxChecked
                      : isDark
                      ? styles.checkboxUncheckedDark
                      : styles.checkboxUncheckedLight,
                  ]}
                >
                  {keepSignedIn && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                </View>
                <Text style={[styles.checkboxLabel, isDark ? styles.textSubDark : styles.textSubLight]}>
                  Keep me signed in
                </Text>
              </TouchableOpacity>

              {/* Sign In Button */}
              <TouchableOpacity
                style={[
                  styles.signInBtn,
                  isDark ? styles.signInBtnDark : styles.signInBtnLight,
                  isLoading && { opacity: 0.7 },
                ]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <Text style={styles.signInText}>
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Text>
                {!isLoading && <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} style={{ marginLeft: 6 }} />}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  bgRoyalBlue: { backgroundColor: '#072A80' }, // Deep royal blue matching reference image
  bgDark: { backgroundColor: '#0B1329' },
  topHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topLogo: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  topTitleGroup: {
    justifyContent: 'center',
  },
  topTitleBrand: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    lineHeight: 13,
  },
  topTitleSub: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 15,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerItemText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  themeToggleBtn: {
    padding: 4,
    marginLeft: 4,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 36,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: 'transparent',
  },
  cardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  logoCircleLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  logoCircleDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  logoImage: {
    width: 72,
    height: 72,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  titleLight: {
    color: '#0B3996',
  },
  titleDark: {
    color: '#60A5FA',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1.5,
    marginTop: 6,
    marginBottom: 28,
    textTransform: 'uppercase',
  },
  textSubLight: {
    color: '#64748B',
  },
  textSubDark: {
    color: '#94A3B8',
  },
  formContainer: {
    width: '100%',
  },
  fieldGroup: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  labelLight: {
    color: '#1E293B',
  },
  labelDark: {
    color: '#F8FAFC',
  },
  forgotLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  linkLight: {
    color: '#0B3996',
  },
  linkDark: {
    color: '#60A5FA',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  inputBoxLight: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  inputBoxDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    fontWeight: '600',
  },
  textInputLight: {
    color: '#0F172A',
  },
  textInputDark: {
    color: '#FFFFFF',
  },
  eyeBtn: {
    padding: 6,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
  },
  checkboxChecked: {
    backgroundColor: '#0B3996',
    borderColor: '#0B3996',
  },
  checkboxUncheckedLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },
  checkboxUncheckedDark: {
    backgroundColor: '#0F172A',
    borderColor: '#475569',
  },
  checkboxLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  signInBtn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B3996',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  signInBtnLight: {
    backgroundColor: '#0B3996',
  },
  signInBtnDark: {
    backgroundColor: '#1D4ED8',
  },
  signInText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
