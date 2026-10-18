import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../src/theme/tokens';
import { getTickets, deleteTicket, updateTicket } from '../../src/services/storage';
import { checkTicket } from '../../src/services/api';
import TicketCard from '../../src/components/TicketCard';
import { Ticket, TicketStatus } from '../../src/types';

const FILTERS: { label: string; value: TicketStatus | 'all' }[] = [
  { label: 'Tümü', value: 'all' },
  { label: 'Bekliyor', value: 'pending' },
  { label: 'Kazandı', value: 'won' },
  { label: 'Kontrol Edildi', value: 'checked' },
];

export default function HistoryScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<TicketStatus | 'all'>('all');

  const load = useCallback(async () => {
    setTickets(await getTickets());
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = filter === 'all' ? tickets : tickets.filter((t) => t.status === filter);

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
    } catch {
      Alert.alert('Hata', 'Kontrol yapılamadı.');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Bilet Sil', 'Bu bileti silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => { await deleteTicket(id); await load(); },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />

      <View style={styles.topBar}>
        <View style={styles.logo}><Text style={styles.logoText}>W</Text></View>
        <Text style={styles.title}>Sonuçlar</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, filter === f.value && styles.filterActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="history" color={colors.textMuted} size={48} />
            <Text style={styles.emptyText}>Kayıt bulunamadı</Text>
          </View>
        ) : (
          filtered.map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              onPress={() =>
                t.status === 'pending'
                  ? handleCheck(t)
                  : handleDelete(t.id)
              }
            />
          ))
        )}
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
  filterScroll: { marginBottom: spacing.md },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm, backgroundColor: colors.bgCard },
  filterActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  filterText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: colors.textDark },
  emptyState: { alignItems: 'center', paddingVertical: 64, gap: 8 },
  emptyText: { color: colors.textMuted, fontSize: 15 },
});
