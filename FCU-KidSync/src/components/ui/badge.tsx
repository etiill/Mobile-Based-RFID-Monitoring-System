import React from 'react';
import { StyleSheet, View, Text, ViewProps, TextProps } from 'react-native';

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info';

interface BadgeProps extends ViewProps {
  variant?: BadgeVariant;
  isDark?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  isDark,
  style,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          box: isDark ? styles.bgSecondaryDark : styles.bgSecondaryLight,
          text: isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
        };
      case 'outline':
        return {
          box: isDark ? styles.bgOutlineDark : styles.bgOutlineLight,
          text: isDark ? styles.textOutlineDark : styles.textOutlineLight,
        };
      case 'destructive':
        return {
          box: styles.bgDestructive,
          text: styles.textDestructive,
        };
      case 'success':
        return {
          box: isDark ? styles.bgSuccessDark : styles.bgSuccessLight,
          text: isDark ? styles.textSuccessDark : styles.textSuccessLight,
        };
      case 'warning':
        return {
          box: isDark ? styles.bgWarningDark : styles.bgWarningLight,
          text: isDark ? styles.textWarningDark : styles.textWarningLight,
        };
      case 'info':
        return {
          box: isDark ? styles.bgInfoDark : styles.bgInfoLight,
          text: isDark ? styles.textInfoDark : styles.textInfoLight,
        };
      default:
        return {
          box: styles.bgDefault,
          text: styles.textDefault,
        };
    }
  };

  const vStyles = getVariantStyles();

  const renderContent = () => {
    return React.Children.map(children, (child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return <Text style={[styles.badgeText, vStyles.text]}>{child}</Text>;
      }
      return child;
    });
  };

  return (
    <View style={[styles.badge, vStyles.box, style]} {...props}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  // Default
  bgDefault: { backgroundColor: '#4F46E5' },
  textDefault: { color: '#FFFFFF' },
  // Secondary
  bgSecondaryLight: { backgroundColor: '#F1F5F9' },
  bgSecondaryDark: { backgroundColor: '#334155' },
  textSecondaryLight: { color: '#0F172A' },
  textSecondaryDark: { color: '#F8FAFC' },
  // Outline
  bgOutlineLight: { backgroundColor: 'transparent', borderColor: '#CBD5E1' },
  bgOutlineDark: { backgroundColor: 'transparent', borderColor: '#475569' },
  textOutlineLight: { color: '#475569' },
  textOutlineDark: { color: '#94A3B8' },
  // Destructive
  bgDestructive: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
  textDestructive: { color: '#991B1B' },
  // Success
  bgSuccessLight: { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0' },
  bgSuccessDark: { backgroundColor: '#064E3B', borderColor: '#047857' },
  textSuccessLight: { color: '#065F46' },
  textSuccessDark: { color: '#6EE7B7' },
  // Warning
  bgWarningLight: { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
  bgWarningDark: { backgroundColor: '#78350F', borderColor: '#B45309' },
  textWarningLight: { color: '#92400E' },
  textWarningDark: { color: '#FDE68A' },
  // Info
  bgInfoLight: { backgroundColor: '#DBEAFE', borderColor: '#BFDBFE' },
  bgInfoDark: { backgroundColor: '#1E3A8A', borderColor: '#1D4ED8' },
  textInfoLight: { color: '#1E40AF' },
  textInfoDark: { color: '#93C5FD' },
});
