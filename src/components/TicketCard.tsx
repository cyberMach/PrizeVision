import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';
import { Ticket } from '../types';
import LotteryBall from './LotteryBall';

interface Props {
  ticket: Ticket;
  onPress?: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'BEKLİYOR',
  checked: 'KONTROL EDİLDİ',
  won: 'KAZANDI',
  expired: 'SÜRESİ DOLDU',
};

const STATUS_COLOR: Record<string, string> = {
  pending: colors.gold,
  checked: colors.surface,
  won: colors.success,
  expired: colors.textMuted,
};

export default function TicketCard({ ticket, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <View style={styles.lotteryBadge}>
          <Text style={styles.lotteryName}>{ticket.lottery}</Text>
        </View>
        <View
          style={[
            styles.statusChip,
            { borderColor: STATUS_COLOR[ticket.status] },
          ]}
        >
          <Text style={[styles.statusText, { color: STATUS_COLOR[ticket.status] }]}>
            {STATUS_LABEL[ticket.status]}
          </Text>
        </View>
      </View>

      <Text style={styles.drawDate}>Çekiliş: {ticket.drawDate}</Text>

      <View style={styles.ballsRow}>
        {ticket.mainBalls.map((n) => (
          <LotteryBall
            key={`m${n}`}
            number={n}
            type={ticket.status === 'won' ? 'matched' : 'main'}
            size={36}
          />
        ))}
        <View style={styles.separator} />
        {ticket.starBalls.map((n) => (
          <LotteryBall key={`s${n}`} number={n} type="star" size={36} />
        ))}
      </View>

      {ticket.checkResult?.wins ? (
        <View style={styles.prizeRow}>
          <Text style={styles.prizeText}>
            🏆 {ticket.checkResult.total_prize.toLocaleString('tr-TR')}€ ikramiye
          </Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {ticket.isAIPick ? '✦ AI Seçimi' : 'Kişisel Bilet'} · {ticket.id.slice(-6).toUpperCase()}
        </Text>
        <Text style={styles.footerLink}>Detay &amp; QR ↗</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  lotteryBadge: {
    backgroundColor: colors.bgLayer2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  lotteryName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  drawDate: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  ballsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: 2,
  },
  prizeRow: {
    marginTop: 10,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: radius.md,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  prizeText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  footerLink: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '600',
  },
});
