import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, StatusBar, Share, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../src/theme/tokens';
import { getTickets } from '../../src/services/storage';
import { Ticket } from '../../src/types';

interface MonthData { month: string; value: number; frontColor: string }

function SimpleBarChart({ data }: { data: MonthData[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 8, paddingTop: 8 }}>
      {data.map((d) => (
        <View key={d.month} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <Text style={{ color: colors.textMuted, fontSize: 9 }}>
            {d.value > 0 ? `€${(d.value / 1000).toFixed(0)}K` : ''}
          </Text>
          <View style={{
            width: '100%', height: Math.max(4, (d.value / max) * 80),
            backgroundColor: colors.gold, borderRadius: 3,
          }} />
          <Text style={{ color: colors.textMuted, fontSize: 10 }}>{d.month}</Text>
        </View>
      ))}
    </View>
  );
}

function groupByMonth(tickets: Ticket[]): MonthData[] {
  const map: Record<string, number> = {};
  tickets
    .filter((t) => t.status === 'won' && t.checkResult)
    .forEach((t) => {
      const key = t.savedAt.slice(0, 7);
      map[key] = (map[key] ?? 0) + (t.checkResult?.total_prize ?? 0);
    });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([k, v]) => ({
      month: k.slice(5),
      value: Math.round(v),
      frontColor: colors.gold,
    }));
}

export default function ReportScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useFocusEffect(
    useCallback(() => { getTickets().then(setTickets); }, []),
  );

  const won = tickets.filter((t) => t.status === 'won');
  const totalPrize = won.reduce((s, t) => s + (t.checkResult?.total_prize ?? 0), 0);
  const winRate = tickets.length ? Math.round((won.length / tickets.length) * 100) : 0;
  const chartData = groupByMonth(tickets);

  const handleShare = async () => {
    const text = [
      '📊 PrizeVision Kazanç Raporu',
      `Toplam Bilet: ${tickets.length}`,
      `Kazanma: ${won.length}`,
      `Kazanma Oranı: %${winRate}`,
      `Toplam İkramiye: €${totalPrize.toLocaleString('tr-TR')}`,
    ].join('\n');
    await Share.share({ message: text });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />

      <View style={styles.topBar}>
        <View style={styles.logo}><Text style={styles.logoText}>W</Text></View>
        <Text style={styles.title}>Kazanç Raporu</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
          <MaterialIcons name="share" color={colors.textMuted} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>TOPLAM KAZANÇ</Text>
          <Text style={styles.heroValue}>€{totalPrize.toLocaleString('tr-TR')}</Text>
          <Text style={styles.heroSub}>Tüm zamanlar</Text>
        </View>

        <View style={styles.statsGrid}>
          {[
            { label: 'Toplam Bilet', value: tickets.length, icon: 'confirmation-number' },
            { label: 'Kazanma', value: won.length, icon: 'emoji-events' },
            { label: 'Kazanma Oranı', value: `%${winRate}`, icon: 'trending-up' },
            { label: 'Bekleyen', value: tickets.filter((t) => t.status === 'pending').length, icon: 'schedule' },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <MaterialIcons name={s.icon as any} color={colors.accent} size={20} />
              <Text style={styles.statVal}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Aylık Kazanç (€)</Text>
          {chartData.length > 0 ? (
            <SimpleBarChart data={chartData} />
          ) : (
            <View style={styles.emptyChart}>
              <MaterialIcons name="bar-chart" color={colors.textMuted} size={40} />
              <Text style={styles.emptyChartText}>Henüz kazanç verisi yok</Text>
            </View>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary, paddingHorizontal: spacing.md },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingBottom: spacing.md, gap: 8 },
  logo: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: colors.textDark, fontSize: 16, fontWeight: '900' },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  iconBtn: { padding: 4 },
  heroCard: {
    backgroundColor: colors.accent, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.md, alignItems: 'center',
  },
  heroLabel: { color: colors.textDark, fontSize: 11, fontWeight: '800', letterSpacing: 1, opacity: 0.7 },
  heroValue: { color: colors.textDark, fontSize: 40, fontWeight: '900', letterSpacing: -1, marginVertical: 4 },
  heroSub: { color: colors.textDark, fontSize: 12, opacity: 0.6 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: colors.bgCard,
    borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 4,
  },
  statVal: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
  statLabel: { color: colors.textMuted, fontSize: 11 },
  chartCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md,
  },
  chartTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: spacing.md },
  emptyChart: { height: 120, alignItems: 'center', justifyContent: 'center' },
  emptyChartText: { color: colors.textMuted, fontSize: 13 },
});
