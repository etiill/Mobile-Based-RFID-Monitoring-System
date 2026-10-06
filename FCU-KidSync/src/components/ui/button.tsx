import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  TouchableOpacityProps,
  ActivityIndicator,
} from 'react-native';

export type ButtonVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'rose';

export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isDark?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'default',
  size = 'md',
  isLoading = false,
  isDark = false,
  style,
  disabled,
  ...props
}) => {
  const getStyles = () => {
    let btnStyle = styles.btnDefault;
    let textStyle = styles.textDefault;

    switch (variant) {
      case 'secondary':
        btnStyle = isDark ? styles.btnSecondaryDark : styles.btnSecondaryLight;
        textStyle = isDark ? styles.textSecondaryDark : styles.textSecondaryLight;
        break;
      case 'outline':
        btnStyle = isDark ? styles.btnOutlineDark : styles.btnOutlineLight;
        textStyle = isDark ? styles.textOutlineDark : styles.textOutlineLight;
        break;
      case 'ghost':
        btnStyle = styles.btnGhost;
        textStyle = isDark ? styles.textGhostDark : styles.textGhostLight;
        break;
      case 'destructive':
        btnStyle = styles.btnDestructive;
        textStyle = styles.textDestructive;
        break;
      case 'rose':
        btnStyle = styles.btnRose;
        textStyle = styles.textRose;
        break;
      default:
        btnStyle = styles.btnDefault;
        textStyle = styles.textDefault;
        break;
    }

    let sizeStyle = styles.sizeMd;
    let textSizeStyle = styles.textSizeMd;

    if (size === 'sm') {
      sizeStyle = styles.sizeSm;
      textSizeStyle = styles.textSizeSm;
    } else if (size === 'lg') {
      sizeStyle = styles.sizeLg;
      textSizeStyle = styles.textSizeLg;
    }

    return { btnStyle, textStyle, sizeStyle, textSizeStyle };
  };

  const { btnStyle, textStyle, sizeStyle, textSizeStyle } = getStyles();

  const renderContent = () => {
    if (isLoading) {
      return (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? '#4F46E5' : '#FFFFFF'}
          size="small"
        />
      );
    }

    return React.Children.map(children, (child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return <Text style={[styles.baseText, textStyle, textSizeStyle]}>{child}</Text>;
      }
      return child;
    });
  };

  return (
    <TouchableOpacity
      style={[
        styles.baseButton,
        btnStyle,
        sizeStyle,
        (disabled || isLoading) && styles.disabled,
        style,
      ]}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  disabled: {
    opacity: 0.5,
  },
  // Sizes
  sizeSm: { paddingHorizontal: 12, paddingVertical: 8 },
  sizeMd: { paddingHorizontal: 16, paddingVertical: 12 },
  sizeLg: { paddingHorizontal: 20, paddingVertical: 16 },
  textSizeSm: { fontSize: 12 },
  textSizeMd: { fontSize: 13 },
  textSizeLg: { fontSize: 15 },
  // Variants
  btnDefault: { backgroundColor: '#4F46E5' },
  textDefault: { color: '#FFFFFF' },

  btnRose: { backgroundColor: '#E11D48' },
  textRose: { color: '#FFFFFF' },

  btnSecondaryLight: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  btnSecondaryDark: { backgroundColor: '#334155', borderWidth: 1, borderColor: '#475569' },
  textSecondaryLight: { color: '#0F172A' },
  textSecondaryDark: { color: '#FFFFFF' },

  btnOutlineLight: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#CBD5E1' },
  btnOutlineDark: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#475569' },
  textOutlineLight: { color: '#0F172A' },
  textOutlineDark: { color: '#FFFFFF' },

  btnGhost: { backgroundColor: 'transparent' },
  textGhostLight: { color: '#4F46E5' },
  textGhostDark: { color: '#818CF8' },

  btnDestructive: { backgroundColor: '#EF4444' },
  textDestructive: { color: '#FFFFFF' },
});
