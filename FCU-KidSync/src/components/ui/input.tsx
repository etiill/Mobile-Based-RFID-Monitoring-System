import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View, Text } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isDark?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  isDark = false,
  style,
  ...props
}) => {
  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, isDark ? styles.textSubDark : styles.textSubLight]}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          isDark ? styles.inputDark : styles.inputLight,
          error ? styles.inputError : null,
          style,
        ]}
        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    width: '100%',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  inputLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    color: '#0F172A',
  },
  inputDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    color: '#FFFFFF',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '700',
    marginTop: 4,
  },
  textSubLight: { color: '#64748B' },
  textSubDark: { color: '#94A3B8' },
});
