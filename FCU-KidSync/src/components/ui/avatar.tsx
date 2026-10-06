import React from 'react';
import { StyleSheet, View, Text, Image, ImageSourcePropType, ViewProps } from 'react-native';

interface AvatarProps extends ViewProps {
  size?: number;
  source?: ImageSourcePropType;
  fallbackText?: string;
  isDark?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  size = 48,
  source,
  fallbackText = 'U',
  isDark = false,
  style,
  ...props
}) => {
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2.5,
  };

  return (
    <View
      style={[
        styles.avatarContainer,
        containerStyle,
        isDark ? styles.avatarDark : styles.avatarLight,
        style,
      ]}
      {...props}
    >
      {source ? (
        <Image source={source} style={[styles.avatarImage, containerStyle]} resizeMode="cover" />
      ) : (
        <Text style={[styles.avatarFallbackText, { fontSize: size * 0.45 }]}>
          {fallbackText.charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarLight: {
    backgroundColor: '#EEF2FF',
  },
  avatarDark: {
    backgroundColor: '#312E81',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallbackText: {
    fontWeight: '900',
    color: '#4F46E5',
  },
});
