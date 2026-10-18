import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';

interface Props {
  number: number;
  type?: 'main' | 'star' | 'matched' | 'dim';
  size?: number;
}

export default function LotteryBall({ number, type = 'main', size = 40 }: Props) {
  const bg =
    type === 'matched'
      ? colors.gold
      : type === 'star'
        ? colors.accent
        : type === 'dim'
          ? colors.bgCardHigh
          : colors.bgCardHigh;

  const textColor =
    type === 'matched' || type === 'star' ? colors.textDark : colors.textPrimary;

  const borderColor =
    type === 'dim'
      ? 'rgba(255,255,255,0.08)'
      : type === 'matched'
        ? colors.gold
        : 'rgba(255,255,255,0.12)';

  return (
    <View
      style={[
        styles.ball,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderColor,
        },
      ]}
    >
      <Text style={[styles.text, { color: textColor, fontSize: size * 0.38 }]}>
        {number}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ball: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  text: {
    fontWeight: '700',
  },
});
