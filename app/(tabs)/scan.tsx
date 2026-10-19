import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, StatusBar, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../src/theme/tokens';
import { compressForOCR, runOCR, parseCoupon, ParsedPlay } from '../../src/services/ocrService';
import { saveTicket, generateId } from '../../src/services/storage';
import { checkTicket } from '../../src/services/api';
import { SUPPORTED_LOTTERIES, LotteryDef } from '../../src/data/lotteries';
import LotteryBall from '../../src/components/LotteryBall';

type Step = 'camera' | 'processing' | 'confirm';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>('camera');
  const [lottery, setLottery] = useState<LotteryDef>(SUPPORTED_LOTTERIES[0]);
  const [showPicker, setShowPicker] = useState(false);
  const [plays, setPlays] = useState<ParsedPlay[]>([]);
  const [selectedPlay, setSelectedPlay] = useState(0);
  const [drawDate, setDrawDate] = useState('');
  const [checking, setChecking] = useState(false);
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);

  const processImage = async (uri: string) => {
    setStep('processing');
    try {
      const base64 = await compressForOCR(uri);
      const rawText = await runOCR(base64);
      const { plays: parsed, drawDate: date } = parseCoupon(rawText);

      if (parsed.length === 0) {
        Alert.alert(
          'Okunamadı',
          'Kupon sayıları tespit edilemedi. İyi ışıkta, düzgün hizalanmış tekrar deneyin.',
          [{ text: 'Tekrar Dene', onPress: () => setStep('camera') }],
        );
        return;
      }

      setPlays(parsed);
      setDrawDate(date ?? '');
      setSelectedPlay(0);
      setStep('confirm');
    } catch {
      Alert.alert('Hata', 'OCR işlemi başarısız. Tekrar deneyin.', [
        { text: 'Tamam', onPress: () => setStep('camera') },
      ]);
    }
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled) await processImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!result.canceled) await processImage(result.assets[0].uri);
  };

  const toggleMain = (n: number) => {
    setPlays((prev) => prev.map((p, i) => {
      if (i !== selectedPlay) return p;
      const main = p.main.includes(n)
        ? p.main.filter((x) => x !== n)
        : p.main.length < lottery.mainCount ? [...p.main, n].sort((a, b) => a - b) : p.main;
      return { ...p, main };
    }));
  };

  const toggleBonus = (n: number) => {
    setPlays((prev) => prev.map((p, i) => {
      if (i !== selectedPlay) return p;
      const bonus = p.bonus.includes(n)
        ? p.bonus.filter((x) => x !== n)
        : p.bonus.length < lottery.bonusCount ? [...p.bonus, n].sort((a, b) => a - b) : p.bonus;
      return { ...p, bonus };
    }));
  };

  const checkAndSave = async () => {
    const play = plays[selectedPlay];
    if (play.main.length !== lottery.mainCount) {
      Alert.alert('Eksik', `${lottery.mainCount} ana sayı seçin (${play.main.length}/${lottery.mainCount}).`);
      return;
    }
    setChecking(true);
    try {
      const result = await checkTicket({
        lotteryId: lottery.id,
        balls: play.main,
        bonus: play.bonus,
        range: drawDate ? `date:${drawDate}` : 'last_draw',
      });
      await saveTicket({
        id: generateId(),
        lottery: lottery.label,
        lotteryId: lottery.id,
        mainBalls: play.main,
        starBalls: play.bonus,
        drawDate: drawDate || new Date().toISOString().split('T')[0],
        status: result.wins > 0 ? 'won' : 'checked',
        checkResult: result,
        savedAt: new Date().toISOString(),
      });

      if (result.wins > 0) {
        Alert.alert(
          '🏆 Tebrikler!',
          `${result.wins} eşleşme! Kazanç: €${result.total_prize.toLocaleString('tr-TR')}`,
          [{ text: 'Harika!', onPress: () => { setStep('camera'); router.push('/(tabs)/'); } }],
        );
      } else {
        Alert.alert(
          'Sonuç',
          `${result.draws_checked} çekiliş kontrol edildi — bu sefere olmadı.${result.warning ? `\n\n⚠️ ${result.warning}` : ''}`,
          [{ text: 'Tamam', onPress: () => { setStep('camera'); router.push('/(tabs)/'); } }],
        );
      }
    } catch {
      Alert.alert('Hata', 'Kontrol yapılamadı. İnternet bağlantını kontrol et.');
    } finally {
      setChecking(false);
    }
  };

  // ── PERMISSION ────────────────────────────────────────────────────────────
  if (!permission?.granted) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.bgPrimary }]}>
        <MaterialIcons name="camera-alt" color={colors.textMuted} size={64} />
        <Text style={styles.permText}>Kamera izni gerekli</Text>
        <TouchableOpacity style={styles.goldBtn} onPress={requestPermission}>
          <Text style={styles.goldBtnText}>İzin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── CONFIRM ───────────────────────────────────────────────────────────────
  if (step === 'confirm') {
    const play = plays[selectedPlay];
    return (
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />
        <View style={[styles.topBar, { paddingTop: 52 + insets.top }]}>
          <TouchableOpacity onPress={() => setStep('camera')} style={{ padding: 4 }}>
            <MaterialIcons name="arrow-back" color={colors.textPrimary} size={22} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Sayıları Onayla</Text>
          {drawDate ? <Text style={styles.dateChip}>{drawDate}</Text> : <View />}
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>

          {/* Lottery picker */}
          <View>
            <Text style={styles.sectionLabel}>Piyango</Text>
            <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowPicker(!showPicker)}>
              <Text style={styles.pickerTriggerText}>{lottery.label}</Text>
              <MaterialIcons name="expand-more" color={colors.gold} size={18} />
            </TouchableOpacity>
            {showPicker && (
              <View style={styles.dropdown}>
                {SUPPORTED_LOTTERIES.map((l) => (
                  <TouchableOpacity
                    key={l.id}
                    style={[styles.dropdownItem, l.id === lottery.id && styles.dropdownItemActive]}
                    onPress={() => { setLottery(l); setShowPicker(false); }}
                  >
                    <Text style={[styles.dropdownItemText, l.id === lottery.id && { color: colors.gold }]}>{l.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Play selector chips (if multiple plays found) */}
          {plays.length > 1 && (
            <View>
              <Text style={styles.sectionLabel}>Kolon Seç ({plays.length} kolon bulundu)</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {plays.map((p, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.playChip, i === selectedPlay && styles.playChipActive]}
                    onPress={() => setSelectedPlay(i)}
                  >
                    <Text style={[styles.playChipText, i === selectedPlay && { color: colors.textDark }]}>
                      Kolon {p.play}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Preview of current play */}
          <View style={styles.previewCard}>
            <Text style={styles.sectionLabel}>
              OCR Sonucu — Kolon {play.play}
            </Text>
            <View style={styles.ballsRow}>
              {play.main.map((n) => <LotteryBall key={`m${n}`} number={n} type="main" size={38} />)}
              {play.bonus.length > 0 && <View style={styles.sep} />}
              {play.bonus.map((n) => <LotteryBall key={`b${n}`} number={n} type="star" size={38} />)}
            </View>
            <Text style={styles.previewHint}>
              Yanlış sayı varsa aşağıdan düzelt, sonra Kontrol Et'e bas.
            </Text>
          </View>

          {/* Main number grid */}
          <View>
            <Text style={styles.sectionLabel}>
              Ana Sayılar ({play.main.length}/{lottery.mainCount}) — 1–{lottery.mainMax}
            </Text>
            <View style={styles.numGrid}>
              {Array.from({ length: lottery.mainMax }, (_, i) => i + 1).map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.numCell, play.main.includes(n) && styles.numCellActive]}
                  onPress={() => toggleMain(n)}
                >
                  <Text style={[styles.numCellText, play.main.includes(n) && styles.numCellTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bonus grid */}
          {lottery.bonusCount > 0 && (
            <View>
              <Text style={styles.sectionLabel}>
                Yıldız ({play.bonus.length}/{lottery.bonusCount}) — 1–{lottery.bonusMax}
              </Text>
              <View style={styles.numGrid}>
                {Array.from({ length: lottery.bonusMax }, (_, i) => i + 1).map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.numCell, styles.numCellBonus, play.bonus.includes(n) && styles.numCellBonusActive]}
                    onPress={() => toggleBonus(n)}
                  >
                    <Text style={[styles.numCellText, play.bonus.includes(n) && styles.numCellTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.goldBtn} onPress={checkAndSave} disabled={checking}>
            {checking
              ? <ActivityIndicator color={colors.textDark} />
              : <>
                  <MaterialIcons name="search" color={colors.textDark} size={20} />
                  <Text style={styles.goldBtnText}>Kontrol Et & Kaydet</Text>
                </>
            }
          </TouchableOpacity>

          <View style={{ height: insets.bottom + 24 }} />
        </ScrollView>
      </View>
    );
  }

  // ── CAMERA / PROCESSING ───────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {step === 'processing' ? (
        <View style={[styles.camera, styles.center, { backgroundColor: '#000' }]}>
          <ActivityIndicator color={colors.gold} size="large" />
          <Text style={{ color: '#fff', marginTop: 16, fontSize: 14 }}>Kupon analiz ediliyor…</Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 6, fontSize: 12 }}>OCR işleniyor</Text>
        </View>
      ) : (
        <CameraView ref={cameraRef} style={styles.camera}>
          <View style={styles.overlay}>
            <View style={styles.topOverlay}>
              <TouchableOpacity style={styles.camBtn} onPress={pickPhoto}>
                <MaterialIcons name="photo-library" color="#fff" size={20} />
              </TouchableOpacity>
            </View>
            <View style={styles.reticle}>
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
            </View>
            <Text style={styles.hint}>KUPONU HİZALAYIN</Text>
            <View style={{ height: 20 }} />
          </View>
        </CameraView>
      )}

      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + spacing.md }]}>
        {/* Lottery chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: spacing.md }}>
            {SUPPORTED_LOTTERIES.map((l) => (
              <TouchableOpacity
                key={l.id}
                style={[styles.chip, l.id === lottery.id && styles.chipActive]}
                onPress={() => setLottery(l)}
              >
                <Text style={[styles.chipText, l.id === lottery.id && { color: colors.textDark }]}>{l.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
          <TouchableOpacity style={styles.goldBtn} onPress={takePhoto} disabled={step === 'processing'}>
            <MaterialIcons name="camera-alt" color={colors.textDark} size={20} />
            <Text style={styles.goldBtnText}>Fotoğraf Çek</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={pickPhoto} disabled={step === 'processing'}>
            <MaterialIcons name="photo-library" color={colors.gold} size={18} />
            <Text style={styles.outlineBtnText}>Galeriden Seç</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.tipText}>
          💡 İyi ışık, düz tutuş — OCR başarısı artar
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  topBarTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', flex: 1 },
  dateChip: { color: colors.gold, fontSize: 12, fontWeight: '700', backgroundColor: 'rgba(255,186,0,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  camera: { height: 360 },
  overlay: { flex: 1, justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  topOverlay: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 44 },
  camBtn: { backgroundColor: 'rgba(0,0,0,0.55)', padding: 10, borderRadius: radius.full },
  reticle: { alignSelf: 'center', width: 260, height: 160, alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: colors.gold, borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  hint: { color: 'rgba(255,255,255,0.75)', fontSize: 11, textAlign: 'center', letterSpacing: 2 },
  bottomSheet: { backgroundColor: colors.bgPrimary, paddingTop: spacing.md },
  chip: { backgroundColor: colors.bgCard, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  goldBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.gold, borderRadius: radius.lg, paddingVertical: 14 },
  goldBtnText: { color: colors.textDark, fontSize: 15, fontWeight: '700' },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.bgCard, borderRadius: radius.lg, paddingVertical: 13, borderWidth: 1, borderColor: colors.border },
  outlineBtnText: { color: colors.gold, fontSize: 14, fontWeight: '600' },
  tipText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.md },
  permText: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  sectionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  pickerTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: spacing.md, paddingVertical: 12 },
  pickerTriggerText: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  dropdown: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, overflow: 'hidden', marginTop: 4 },
  dropdownItem: { paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownItemActive: { backgroundColor: 'rgba(255,186,0,0.1)' },
  dropdownItemText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  playChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard },
  playChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  playChipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  previewCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: 8 },
  previewHint: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  ballsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  sep: { width: 1, height: 28, backgroundColor: colors.border, marginHorizontal: 2 },
  numGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  numCell: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  numCellActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  numCellBonus: { borderColor: 'rgba(187,138,82,0.4)' },
  numCellBonusActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  numCellText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  numCellTextActive: { color: colors.textDark },
});
