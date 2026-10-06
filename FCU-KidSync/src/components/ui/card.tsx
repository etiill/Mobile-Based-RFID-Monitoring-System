import React from 'react';
import { StyleSheet, View, Text, ViewProps, TextProps } from 'react-native';

interface CardProps extends ViewProps {
  isDark?: boolean;
}

export const Card: React.FC<CardProps> = ({ style, isDark, ...props }) => (
  <View
    style={[
      styles.card,
      isDark ? styles.cardDark : styles.cardLight,
      style,
    ]}
    {...props}
  />
);

export const CardHeader: React.FC<ViewProps> = ({ style, ...props }) => (
  <View style={[styles.cardHeader, style]} {...props} />
);

export const CardTitle: React.FC<TextProps & { isDark?: boolean }> = ({
  style,
  isDark,
  ...props
}) => (
  <Text
    style={[
      styles.cardTitle,
      isDark ? styles.textWhite : styles.textDark,
      style,
    ]}
    {...props}
  />
);

export const CardDescription: React.FC<TextProps & { isDark?: boolean }> = ({
  style,
  isDark,
  ...props
}) => (
  <Text
    style={[
      styles.cardDescription,
      isDark ? styles.textSubDark : styles.textSubLight,
      style,
    ]}
    {...props}
  />
);

export const CardContent: React.FC<ViewProps> = ({ style, ...props }) => (
  <View style={[styles.cardContent, style]} {...props} />
);

export const CardFooter: React.FC<ViewProps> = ({ style, ...props }) => (
  <View style={[styles.cardFooter, style]} {...props} />
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  cardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  cardDescription: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  cardContent: {
    paddingVertical: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  textDark: { color: '#0F172A' },
  textWhite: { color: '#FFFFFF' },
  textSubLight: { color: '#64748B' },
  textSubDark: { color: '#94A3B8' },
});
