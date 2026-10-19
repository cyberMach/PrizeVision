import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, StatusBar, ActivityIndicator, TextInput,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../src/theme/tokens';
import { runOCR } from '../../src/services/api';
import { saveTicket, generateId } from '../../src/services/storage';
import { SUPPORTED_LOTTERIES, LotteryDef } from '../../src/data/lotteries';
import LotteryBall from '../../src/components/LotteryBall';

type Step = 'camera' | 'processing' | 'confirm' | 'manual';

function parseForLottery(text: string, lottery: LotteryDef) {
  const all = (text.match(/\b\d{1,2}\b/g) ?? []).map(Number).filter((n) => n >= 1);
  const unique = [...new Set(all)];
  const main = unique.filter((n) => n <= lottery.mainMax).slice(0, lottery.mainCount);
  const bonus = unique.filter((n) => n <= lottery.bonusMax && !main.includes(n)).slice(0, lottery.bonusCount);
  return { main, bonus };
}

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>('camera');
  const [lottery, setLottery] = useState<LotteryDef>(SUPPORTED_LOTTERIES[0]);
  const [showLotteryPicker, setShowLotteryPicker] = useState(false);
  const [mainBalls, setMainBalls] = useState<number[]>([]);
  const [bonusBalls, setBonusBalls] = useState<number[]>([]);
  const [manualInput, setManualInput] = useState('');
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);

  const processImage = async (uri: string) => {
    setStep('processing');
    try {
      let base64 = '';
      let width = 1200;
      // Retry at smaller sizes if needed (OCR.space free tier ~1MB limit)
      for (const w of [1200, 900, 600]) {
        const res = await ImageManipulator.manipulateAsync(
          uri, [{ resize: { width: w } }],
          { compress: 0.75, base64: true, format: ImageManipulator.SaveFormat.JPEG },
        );
        base64 = res.base64 ?? '';
        width = w;
        if (base64.length < 1_000_000) break;
      }
      const text = await runOCR(base64);
      const { main, bonus } = parseForLottery(text, lottery);
      setMainBalls(main);
      setBonusBalls(bonus);
      setStep('confirm');
    } catch {
      Alert.alert('Hata', 'OCR işlemi başarısız. Manuel giriş deneyin.', [
        { text: 'Manuel Gir', onPress: () => setStep('manual') },
        { text: 'Tekrar Dene', onPress: () => setStep('camera') },
      ]);
    }
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled) await processImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (!result.canceled) await processImage(result.assets[0].uri);
  };

  const toggleMain = (n: number) => {
    setMainBalls((prev) =>
      prev.includes(n)
        ? prev.filter((x) => x !== n)
        : prev.length < lottery.mainCount ? [...prev, n].sort((a, b) => a - b) : prev,
    );
  };

  const toggleBonus = (n: number) => {
    setBonusBalls((prev) =>
      prev.includes(n)
        ? prev.filter((x) => x !== n)
        : prev.length < lottery.bonusCount ? [...prev, n].sort((a, b) => a - b) : prev,
    );
  };

  const saveConfirmed = async () => {
    if (mainBalls.length !== lottery.mainCount) {
      Alert.alert('Eksik Sayı', `${lottery.mainCount} ana sayı seçin (${mainBalls.length}/${lottery.mainCount}).`);
      return;
    }
    await saveTicket({
      id: generateId(),
      lottery: lottery.label,
      lotteryId: lottery.id,
      mainBalls,
      starBalls: bonusBalls,
      drawDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      checkResult: null,
      savedAt: new Date().toISOString(),
    });
    Alert.alert('Kaydedildi ✓', `${lottery.label} bileti eklendi.`, [
      { text: 'Tamam', onPress: () => { setStep('camera'); router.push('/(tabs)/'); } },
    ]);
  };

  const saveManual = async () => {
    const nums = manualInput.split(/[\s,]+/).map(Number).filter((n) => n >= 1 && n <= lottery.mainMax);
    const unique = [...new Set(nums)];
    if (unique.length < lottery.mainCount) {
      Alert.alert('Eksik', `En az ${lottery.mainCount} geçerli sayı girin.`);
      return;
    }
    setMainBalls(unique.slice(0, lottery.mainCount));
    setBonusBalls(unique.slice(lottery.mainCount, lottery.mainCount + lottery.bonusCount));
    setStep('confirm');
  };

  if (!permission?.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <MaterialIcons name="camera-alt" color={colors.textMuted} size={64} />
        <Text style={styles.permText}>Kamera izni gerekli</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>İzin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── CONFIRM STEP ─────────────────────────────────────────────────────────
  if (step === 'confirm') {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />
        <View style={[styles.topBar, { paddingTop: 52 + insets.top }]}>
          <TouchableOpacity onPress={() => setStep('camera')} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" color={colors.textPrimary} size={22} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Sayıları Onayla</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
          {/* Lottery selector */}
          <View style={styles.lotteryRow}>
            <Text style={styles.sectionLabel}>Piyango</Text>
            <TouchableOpacity style={styles.lotteryChip} onPress={() => setShowLotteryPicker(!showLotteryPicker)}>
              <Text style={styles.lotteryChipText}>{lottery.label}</Text>
              <MaterialIcons name="expand-more" color={colors.gold} size={18} />
            </TouchableOpacity>
          </View>
          {showLotteryPicker && (
            <View style={styles.pickerDropdown}>
              {SUPPORTED_LOTTERIES.map((l) => (
                <TouchableOpacity
                  key={l.id}
                  style={[styles.pickerItem, l.id === lottery.id && styles.pickerItemActive]}
                  onPress={() => { setLottery(l); setMainBalls([]); setBonusBalls([]); setShowLotteryPicker(false); }}
                >
                  <Text style={[styles.pickerItemText, l.id === lottery.id && { color: colors.gold }]}>{l.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Main numbers grid */}
          <View>
            <Text style={styles.sectionLabel}>
              Ana Sayılar ({mainBalls.length}/{lottery.mainCount})
            </Text>
            <View style={styles.numGrid}>
              {Array.from({ length: lottery.mainMax }, (_, i) => i + 1).map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.numCell, mainBalls.includes(n) && styles.numCellActive]}
                  onPress={() => toggleMain(n)}
                >
                  <Text style={[styles.numCellText, mainBalls.includes(n) && styles.numCellTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bonus numbers grid */}
          {lottery.bonusCount > 0 && (
            <View>
              <Text style={styles.sectionLabel}>
                Yıldız / Bonus ({bonusBalls.length}/{lottery.bonusCount})
              </Text>
              <View style={styles.numGrid}>
                {Array.from({ length: lottery.bonusMax }, (_, i) => i + 1).map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.numCell, styles.numCellBonus, bonusBalls.includes(n) && styles.numCellBonusActive]}
                    onPress={() => toggleBonus(n)}
                  >
                    <Text style={[styles.numCellText, bonusBalls.includes(n) && styles.numCellTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Preview */}
          {mainBalls.length > 0 && (
            <View style={styles.previewCard}>
              <Text style={styles.sectionLabel}>Önizleme</Text>
              <View style={styles.ballsRow}>
                {mainBalls.map((n) => <LotteryBall key={`m${n}`} number={n} type="main" size={38} />)}
                {bonusBalls.length > 0 && <View style={styles.sep} />}
                {bonusBalls.map((n) => <LotteryBall key={`b${n}`} number={n} type="star" size={38} />)}
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.saveBtn} onPress={saveConfirmed}>
            <MaterialIcons name="save" color={colors.textDark} size={20} />
            <Text style={styles.saveBtnText}>Bileti Kaydet</Text>
          </TouchableOpacity>
          <View style={{ height: insets.bottom + 16 }} />
        </ScrollView>
      </View>
    );
  }

  // ── MANUAL STEP ──────────────────────────────────────────────────────────
  if (step === 'manual') {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgPrimary, padding: spacing.md }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />
        <View style={[styles.topBar, { paddingTop: 52 + insets.top, paddingHorizontal: 0 }]}>
          <TouchableOpacity onPress={() => setStep('camera')} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" color={colors.textPrimary} size={22} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Manuel Giriş</Text>
        </View>
        <Text style={styles.manualHint}>
          {lottery.label} için {lottery.mainCount} sayı girin (1–{lottery.mainMax}), virgül veya boşlukla ayırın.
          {lottery.bonusCount > 0 ? ` İlk ${lottery.mainCount} ana, sonraki ${lottery.bonusCount} bonus olarak alınır.` : ''}
        </Text>
        <TextInput
          style={styles.manualInput}
          placeholder="Örn: 7 14 23 38 45 3 11"
          placeholderTextColor={colors.textMuted}
          value={manualInput}
          onChangeText={setManualInput}
          keyboardType="numeric"
          multiline
        />
        <TouchableOpacity style={styles.saveBtn} onPress={saveManual}>
          <Text style={styles.saveBtnText}>Devam Et →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── CAMERA STEP ──────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {step === 'processing' ? (
        <View style={[styles.camera, styles.center, { backgroundColor: '#000' }]}>
          <ActivityIndicator color={colors.gold} size="large" />
          <Text style={{ color: '#fff', marginTop: 12 }}>OCR analiz ediliyor…</Text>
        </View>
      ) : (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          onBarcodeScanned={undefined}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'qr', 'code128'] }}
        >
          <View style={styles.overlay}>
            <View style={styles.topInfo}>
              <TouchableOpacity style={styles.lotteryChipCam} onPress={() => setShowLotteryPicker(!showLotteryPicker)}>
                <Text style={styles.lotteryChipCamText}>{lottery.label}</Text>
                <MaterialIcons name="expand-more" color={colors.gold} size={16} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.camBtn} onPress={pickPhoto}>
                <MaterialIcons name="photo-library" color="#fff" size={20} />
              </TouchableOpacity>
            </View>

            {showLotteryPicker && (
              <View style={styles.pickerDropdownCam}>
                {SUPPORTED_LOTTERIES.map((l) => (
                  <TouchableOpacity
                    key={l.id}
                    style={[styles.pickerItem, l.id === lottery.id && styles.pickerItemActive]}
                    onPress={() => { setLottery(l); setShowLotteryPicker(false); }}
                  >
                    <Text style={[styles.pickerItemText, l.id === lottery.id && { color: colors.gold }]}>{l.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.reticle}>
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
            </View>
            <Text style={styles.hint}>BİLETİ HİZALAYIN · {lottery.label.toUpperCase()}</Text>
            <View style={{ height: 24 }} />
          </View>
        </CameraView>
      )}

      <ScrollView style={styles.bottomSheet} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.primaryBtn} onPress={takePhoto} disabled={step === 'processing'}>
          <MaterialIcons name="camera-alt" color={colors.textDark} size={20} />
          <Text style={styles.primaryBtnText}>Fotoğraf Çek & OCR</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('manual')}>
          <MaterialIcons name="keyboard" color={colors.gold} size={18} />
          <Text style={styles.secondaryBtnText}>Manuel Numara Gir</Text>
        </TouchableOpacity>

        <View style={styles.supportedSection}>
          <Text style={styles.supportedTitle}>Desteklenen Piyangolar</Text>
          <View style={styles.chipRow}>
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
        </View>
        <View style={{ height: 80 + insets.bottom }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  backBtn: { padding: 4 },
  topBarTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  camera: { height: 340 },
  overlay: { flex: 1, justifyContent: 'space-between', padding: spacing.md },
  topInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 44 },
  camBtn: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: radius.full },
  lotteryChipCam: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.gold },
  lotteryChipCamText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  reticle: { alignSelf: 'center', width: 240, height: 130, alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: 22, height: 22, borderColor: colors.gold, borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  hint: { color: 'rgba(255,255,255,0.7)', fontSize: 11, textAlign: 'center', letterSpacing: 1.5 },
  bottomSheet: { flex: 1, backgroundColor: colors.bgPrimary, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.gold, borderRadius: radius.lg, paddingVertical: 14, marginBottom: spacing.sm },
  primaryBtnText: { color: colors.textDark, fontSize: 15, fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.bgCard, borderRadius: radius.lg, paddingVertical: 13, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  secondaryBtnText: { color: colors.gold, fontSize: 14, fontWeight: '600' },
  supportedSection: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  supportedTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: colors.bgLayer2, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.textSecondary, fontSize: 12 },
  pickerDropdown: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, overflow: 'hidden' },
  pickerDropdownCam: { backgroundColor: 'rgba(10,15,30,0.95)', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, overflow: 'hidden', marginHorizontal: spacing.md },
  pickerItem: { paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerItemActive: { backgroundColor: 'rgba(255,186,0,0.1)' },
  pickerItemText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  sectionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  lotteryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lotteryChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.bgCard, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.borderStrong },
  lotteryChipText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  numGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  numCell: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  numCellActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  numCellBonus: { backgroundColor: colors.bgLayer2, borderColor: 'rgba(187,138,82,0.4)' },
  numCellBonusActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  numCellText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  numCellTextActive: { color: colors.textDark },
  previewCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  ballsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  sep: { width: 1, height: 28, backgroundColor: colors.border, marginHorizontal: 2 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.gold, borderRadius: radius.lg, paddingVertical: 15 },
  saveBtnText: { color: colors.textDark, fontSize: 15, fontWeight: '700' },
  manualHint: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: spacing.md },
  manualInput: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, color: colors.textPrimary, fontSize: 18, padding: spacing.md, marginBottom: spacing.md, minHeight: 80, textAlignVertical: 'top' },
  permText: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  permBtn: { backgroundColor: colors.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.lg },
  permBtnText: { color: colors.textDark, fontSize: 14, fontWeight: '700' },
});
