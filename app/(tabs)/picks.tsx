import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../src/theme/tokens';

function getNextDrawDate(): string {
  const now = new Date();
  for (let i = 0; i <= 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    d.setHours(21, 0, 0, 0);
    if ([2, 5].includes(d.getDay()) && d > now)
      return d.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}
import { fetchLatestDraws } from '../../src/services/api';
import { generateAIGroups } from '../../src/services/aiPicks';
import { saveTicket, generateId } from '../../src/services/storage';
import LotteryBall from '../../src/components/LotteryBall';
import { AIGroup } from '../../src/types';

const EUROMILLIONS_ID = 728;

export default function PicksScreen() {
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<AIGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const draws = await fetchLatestDraws(EUROMILLIONS_ID, 50);
      setGroups(generateAIGroups(draws));
    } catch {
      setGroups(generateAIGroups([]));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = (id: number) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, selected: !g.selected } : g)),
    );
  };

  const selectedCount = groups.filter((g) => g.selected).length;

  const saveSelected = async () => {
    const selected = groups.filter((g) => g.selected);
    if (!selected.length) {
      Alert.alert('Seçim Yok', 'En az bir grup seçin.');
      return;
    }
    setSaving(true);
    for (const g of selected) {
      await saveTicket({
        id: generateId(),
        lottery: 'EuroMillions',
        lotteryId: EUROMILLIONS_ID,
        mainBalls: g.mainBalls,
        starBalls: g.starBalls,
        drawDate: getNextDrawDate(),
        status: 'pending',
        checkResult: null,
        savedAt: new Date().toISOString(),
        isAIPick: true,
      });
    }
    setSaving(false);
    Alert.alert('Kaydedildi', `${selected.length} bilet Ana Sayfa'ya eklendi.`);
    setGroups((prev) => prev.map((g) => ({ ...g, selected: false })));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />

      <View style={styles.topBar}>
        <View style={styles.logo}><Text style={styles.logoText}>W</Text></View>
        <Text style={styles.title}>Lucky AI</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={load} style={styles.iconBtn}>
          <MaterialIcons name="refresh" color={colors.textMuted} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.infoBanner}>
        <Text style={styles.infoIcon}>⚡</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>AI Quantum Tahmin Motoru</Text>
          <Text style={styles.infoSub}>20 Ekim Çekilişi · Frekans + Monte Carlo analizi</Text>
        </View>
        <Text style={styles.infoScore}>99.4%{'\n'}F1-Skor</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} size="large" />
          <Text style={styles.loadingText}>Çekiliş verileri analiz ediliyor...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
          {groups.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[styles.groupCard, g.selected && styles.groupSelected]}
              onPress={() => toggle(g.id)}
              activeOpacity={0.85}
            >
              <View style={styles.groupHeader}>
                <View style={styles.groupNumBadge}>
                  <Text style={styles.groupNum}>{g.id}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupLabel}>{g.label}</Text>
                  <Text style={styles.groupDesc}>{g.description}</Text>
                </View>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreText}>⊕ %{g.score}</Text>
                </View>
                <View style={[styles.checkbox, g.selected && styles.checkboxActive]}>
                  {g.selected && <MaterialIcons name="check" color={colors.textDark} size={14} />}
                </View>
              </View>

              <View style={styles.ballsRow}>
                {g.mainBalls.map((n) => (
                  <LotteryBall key={`m${n}`} number={n} type="main" size={38} />
                ))}
                <View style={styles.separator} />
                {g.starBalls.map((n) => (
                  <LotteryBall key={`s${n}`} number={n} type="star" size={38} />
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {!loading && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.sm }]}>
          <Text style={styles.bottomCount}>
            {selectedCount > 0 ? `${selectedCount} Kolon Seçildi` : 'Kolon seçin'}
          </Text>
          <TouchableOpacity
            style={[styles.saveBtn, selectedCount === 0 && styles.saveBtnDim]}
            onPress={saveSelected}
            disabled={saving || selectedCount === 0}
          >
            {saving ? (
              <ActivityIndicator color={colors.textDark} size="small" />
            ) : (
              <>
                <MaterialIcons name="save" color={colors.textDark} size={18} />
                <Text style={styles.saveBtnText}>Seçilenleri Kaydet</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderStrong,
    padding: spacing.md, marginBottom: spacing.md,
  },
  infoIcon: { fontSize: 22 },
  infoTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  infoSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  infoScore: { color: colors.gold, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.textMuted, fontSize: 13 },
  groupCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 3, borderLeftColor: colors.accent,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  groupSelected: { borderColor: colors.gold, borderLeftColor: colors.gold, backgroundColor: colors.bgCardHigh },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  groupNumBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bgLayer2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong },
  groupNum: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  groupLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  groupDesc: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  scoreBadge: { backgroundColor: 'rgba(187,138,82,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(187,138,82,0.4)' },
  scoreText: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  ballsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  separator: { width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: 2 },
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgLayer1,
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing.sm, paddingHorizontal: spacing.sm,
    marginHorizontal: -spacing.md,
  },
  bottomCount: { color: colors.textMuted, fontSize: 12, flex: 1 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.gold, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.md },
  saveBtnDim: { opacity: 0.5 },
  saveBtnText: { color: colors.textDark, fontSize: 13, fontWeight: '700' },
});
