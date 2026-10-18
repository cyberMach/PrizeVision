import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, StatusBar,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../src/theme/tokens';
import { getTickets } from '../../src/services/storage';
import { checkTicket } from '../../src/services/api';
import { updateTicket } from '../../src/services/storage';
import { requestPermissions, registerBackgroundTask } from '../../src/services/notifications';
import TicketCard from '../../src/components/TicketCard';
import { Ticket } from '../../src/types';

const JACKPOT = 210_000_000;

export default function HomeScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getTickets();
    setTickets(data);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    requestPermissions();
    registerBackgroundTask();
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
        <TouchableOpacity style={styles.iconBtn}>
          <MaterialIcons name="notifications-none" color={colors.textSecondary} size={22} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn}>
          <MaterialIcons name="account-circle" color={colors.textSecondary} size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        <View style={styles.jackpotCard}>
          <Text style={styles.jackpotLabel}>🎯 EuroMillions Jackpot</Text>
          <Text style={styles.jackpotAmount}>€{(JACKPOT / 1_000_000).toFixed(0)}M</Text>
          <Text style={styles.jackpotSub}>Salı 20 Ekim 2026 · 22:00 CET</Text>
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
              onPress={() => t.status === 'pending' ? handleCheck(t) : null}
            />
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={styles.fabRow}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.bgCard, flex: 1 }]}
          onPress={() => router.push('/(tabs)/scan')}
        >
          <MaterialIcons name="qr-code-scanner" color={colors.gold} size={20} />
          <Text style={[styles.fabText, { color: colors.gold }]}>Kupon Tara</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.gold, flex: 1 }]}
          onPress={() => router.push('/(tabs)/picks')}
        >
          <MaterialIcons name="auto-awesome" color={colors.textDark} size={20} />
          <Text style={[styles.fabText, { color: colors.textDark }]}>AI Önerisi</Text>
        </TouchableOpacity>
      </View>
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
  jackpotSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
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
  fabRow: { position: 'absolute', bottom: 72, left: spacing.md, right: spacing.md, flexDirection: 'row', gap: spacing.sm },
  fab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  fabText: { fontSize: 14, fontWeight: '700' },
});
