import React from 'react';
import { StyleSheet, View, Text, ViewProps, TextProps } from 'react-native';

export type AlertVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info';

interface AlertProps extends ViewProps {
  variant?: AlertVariant;
  isDark?: boolean;
}

export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'default',
  isDark = false,
  style,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return isDark ? styles.alertDestructiveDark : styles.alertDestructiveLight;
      case 'success':
        return isDark ? styles.alertSuccessDark : styles.alertSuccessLight;
      case 'warning':
        return isDark ? styles.alertWarningDark : styles.alertWarningLight;
      case 'info':
        return isDark ? styles.alertInfoDark : styles.alertInfoLight;
      default:
        return isDark ? styles.alertDefaultDark : styles.alertDefaultLight;
    }
  };

  return (
    <View style={[styles.alert, getVariantStyles(), style]} {...props}>
      {children}
    </View>
  );
};

export const AlertTitle: React.FC<TextProps & { isDark?: boolean }> = ({
  style,
  isDark,
  ...props
}) => (
  <Text
    style={[
      styles.alertTitle,
      isDark ? styles.textWhite : styles.textDark,
      style,
    ]}
    {...props}
  />
);

export const AlertDescription: React.FC<TextProps & { isDark?: boolean }> = ({
  style,
  isDark,
  ...props
}) => (
  <Text
    style={[
      styles.alertDescription,
      isDark ? styles.textSubDark : styles.textSubLight,
      style,
    ]}
    {...props}
  />
);

const styles = StyleSheet.create({
  alert: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },
  alertDescription: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  alertDefaultLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  alertDefaultDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  alertDestructiveLight: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  alertDestructiveDark: {
    backgroundColor: '#451A1A',
    borderColor: '#991B1B',
  },
  alertSuccessLight: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  alertSuccessDark: {
    backgroundColor: '#064E3B',
    borderColor: '#047857',
  },
  alertWarningLight: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  alertWarningDark: {
    backgroundColor: '#451A03',
    borderColor: '#92400E',
  },
  alertInfoLight: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  alertInfoDark: {
    backgroundColor: '#1E1B4B',
    borderColor: '#3730A3',
  },
  textDark: { color: '#0F172A' },
  textWhite: { color: '#FFFFFF' },
  textSubLight: { color: '#64748B' },
  textSubDark: { color: '#94A3B8' },
});
