import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, StatusBar, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../src/theme/tokens';
import { getTickets, updateTicket } from '../../src/services/storage';
import { checkTicket, fetchJackpot } from '../../src/services/api';
import { requestPermissions, registerBackgroundTask } from '../../src/services/notifications';
import TicketCard from '../../src/components/TicketCard';
import { Ticket } from '../../src/types';

const EUROMILLIONS_ID = 728;
const JACKPOT_FALLBACK = 210_000_000;
// Next EuroMillions draw: every Tuesday & Friday at 21:00 CET (UTC+1)
function getNextDrawDate(): Date {
  const now = new Date();
  const drawDays = [2, 5]; // Tuesday=2, Friday=5
  for (let i = 0; i <= 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    d.setHours(21, 0, 0, 0); // 21:00 CET = 20:00 UTC, approximate with local
    if (drawDays.includes(d.getDay()) && d > now) return d;
  }
  return now;
}

function useCountdown(target: Date) {
  const calc = () => {
    const diff = Math.max(0, target.getTime() - Date.now());
    const g = Math.floor(diff / 86400000);
    const s = Math.floor((diff % 86400000) / 3600000);
    const d = Math.floor((diff % 3600000) / 60000);
    return { g, s, d };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 60000);
    return () => clearInterval(id);
  }, [target]);
  return time;
}

export default function HomeScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [jackpot, setJackpot] = useState(JACKPOT_FALLBACK);
  const insets = useSafeAreaInsets();
  const nextDraw = getNextDrawDate();
  const countdown = useCountdown(nextDraw);
  const drawLabel = nextDraw.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

  const load = useCallback(async () => {
    const data = await getTickets();
    setTickets(data);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    requestPermissions();
    registerBackgroundTask();
    fetchJackpot(EUROMILLIONS_ID).then((v) => { if (v) setJackpot(v); });
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleCheck = async (ticket: Ticket) => {
    try {
      const result = await checkTicket({
        lotteryId: ticket.lotteryId,
        balls: ticket.mainBalls,
        bonus: ticket.starBalls,
      });
      await updateTicket(ticket.id, {
        status: result.wins > 0 ? 'won' : 'checked',
        checkResult: result,
      });
      await load();
    } catch (e) {
      console.warn('Check failed', e);
    }
  };

  const active = tickets.filter((t) => t.status === 'pending');
  const won = tickets.filter((t) => t.status === 'won');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />

      <View style={styles.topBar}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>W</Text>
        </View>
        <Text style={styles.title}>PrizeVision</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => Alert.alert('Bildirimler', 'Yeni bildirim yok.\n\nÇekiliş günleri otomatik kontrol aktif.')}
        >
          <MaterialIcons name="notifications-none" color={colors.textSecondary} size={22} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => Alert.alert('PrizeVision', 'tatasagun@gmail.com\n\nSürüm: 1.0.0\nAPI: lotteryresultsfeed.com')}
        >
          <MaterialIcons name="account-circle" color={colors.textSecondary} size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        <View style={styles.jackpotCard}>
          <Text style={styles.jackpotLabel}>🎯 EuroMillions Jackpot</Text>
          <Text style={styles.jackpotAmount}>€{(jackpot / 1_000_000).toFixed(0)}M</Text>
          <Text style={styles.jackpotSub}>{drawLabel} · 21:00 CET</Text>
          <View style={styles.countdownRow}>
            <View style={styles.countdownItem}>
              <Text style={styles.countdownNum}>{String(countdown.g).padStart(2, '0')}</Text>
              <Text style={styles.countdownUnit}>GÜN</Text>
            </View>
            <Text style={styles.countdownSep}>:</Text>
            <View style={styles.countdownItem}>
              <Text style={styles.countdownNum}>{String(countdown.s).padStart(2, '0')}</Text>
              <Text style={styles.countdownUnit}>SAAT</Text>
            </View>
            <Text style={styles.countdownSep}>:</Text>
            <View style={styles.countdownItem}>
              <Text style={styles.countdownNum}>{String(countdown.d).padStart(2, '0')}</Text>
              <Text style={styles.countdownUnit}>DAKİKA</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{active.length}</Text>
            <Text style={styles.statLabel}>Aktif Bilet</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success }]}>{won.length}</Text>
            <Text style={styles.statLabel}>Kazanılan</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{tickets.length}</Text>
            <Text style={styles.statLabel}>Toplam</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Kayıtlı Biletlerim</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
            <Text style={styles.seeAll}>TÜMÜ ({tickets.length}) &gt;</Text>
          </TouchableOpacity>
        </View>

        {tickets.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="confirmation-number" color={colors.textMuted} size={48} />
            <Text style={styles.emptyText}>Henüz kayıtlı bilet yok</Text>
            <Text style={styles.emptySubText}>Kupon tara veya AI önerisi al</Text>
          </View>
        ) : (
          tickets.slice(0, 5).map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              onCheck={t.status === 'pending' ? () => handleCheck(t) : undefined}
            />
          ))
        )}

        <View style={{ height: 16 + insets.bottom }} />
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
  jackpotCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    borderTopWidth: 2,
    borderTopColor: colors.gold,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  jackpotLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
  jackpotAmount: { color: colors.gold, fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  jackpotSub: { color: colors.textMuted, fontSize: 12, marginTop: 2, marginBottom: 12 },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  countdownItem: { alignItems: 'center', backgroundColor: colors.bgCardHigh, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6, minWidth: 52 },
  countdownNum: { color: colors.gold, fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  countdownUnit: { color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  countdownSep: { color: colors.gold, fontSize: 20, fontWeight: '800', marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  seeAll: { color: colors.gold, fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyText: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  emptySubText: { color: colors.textMuted, fontSize: 13 },
});
