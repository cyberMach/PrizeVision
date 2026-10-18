import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, StatusBar, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, radius } from '../../src/theme/tokens';
import { runOCR } from '../../src/services/api';
import { saveTicket, generateId } from '../../src/services/storage';

const LOTTERIES = [
  { label: 'Sayısal Loto', country: 'TR' },
  { label: 'Süper Loto', country: 'TR' },
  { label: 'Şans Topu', country: 'TR' },
  { label: 'Milli Piyango', country: 'TR' },
  { label: 'EuroMillions', country: 'EU', id: 728 },
  { label: 'EuroDreams', country: 'EU' },
  { label: 'M1lhão', country: 'EU' },
];

function parseNumbers(text: string): number[] {
  const nums = text.match(/\b([1-9]|[1-4][0-9]|50)\b/g) ?? [];
  return [...new Set(nums.map(Number))].slice(0, 7);
}

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const handleBarcode = async ({ data }: { data: string }) => {
    if (scanning) return;
    setScanning(true);
    Alert.alert('Barkod Okundu', `Seri: ${data}`, [
      { text: 'Manuel Gir', onPress: () => setScanning(false) },
      {
        text: 'Kaydet',
        onPress: async () => {
          await saveTicket({
            id: generateId(),
            lottery: 'EuroMillions',
            lotteryId: 728,
            mainBalls: [],
            starBalls: [],
            drawDate: new Date().toISOString().split('T')[0],
            status: 'pending',
            checkResult: null,
            savedAt: new Date().toISOString(),
          });
          router.push('/(tabs)/');
        },
      },
    ]);
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled) return;
    await processImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled) return;
    await processImage(result.assets[0].uri);
  };

  const processImage = async (uri: string) => {
    setProcessing(true);
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        uri, [{ resize: { width: 1200 } }],
        { compress: 0.7, base64: true, format: ImageManipulator.SaveFormat.JPEG },
      );
      const text = await runOCR(compressed.base64 ?? '');
      const nums = parseNumbers(text);
      const main = nums.slice(0, 5);
      const stars = nums.slice(5, 7);
      await saveTicket({
        id: generateId(),
        lottery: 'EuroMillions',
        lotteryId: 728,
        mainBalls: main,
        starBalls: stars.length ? stars : [2, 8],
        drawDate: new Date().toISOString().split('T')[0],
        status: 'pending',
        checkResult: null,
        savedAt: new Date().toISOString(),
      });
      Alert.alert('Kaydedildi', `${main.length} ana + ${stars.length} yıldız sayısı tespit edildi.`, [
        { text: 'Tamam', onPress: () => router.push('/(tabs)/') },
      ]);
    } catch {
      Alert.alert('Hata', 'OCR işlemi başarısız oldu. Manuel giriş deneyin.');
    } finally {
      setProcessing(false);
    }
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        onBarcodeScanned={scanning ? undefined : handleBarcode}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'qr', 'code128'] }}
      >
        <View style={styles.overlay}>
          <View style={styles.topInfo}>
            <View style={styles.qualityBadge}>
              <Text style={styles.qualityText}>● HD 1080P · 60 FPS</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.camBtn}>
                <MaterialIcons name="flash-off" color="#fff" size={20} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.camBtn} onPress={pickPhoto}>
                <MaterialIcons name="photo-library" color="#fff" size={20} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.reticle}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            {processing && <ActivityIndicator color={colors.gold} size="large" />}
          </View>
          <Text style={styles.hint}>BİLETİ HİZALAYIN</Text>

          <View style={styles.bottomInfo}>
            <Text style={styles.bottomInfoText}>● OTO-ODAK AÇIK</Text>
            <Text style={styles.bottomInfoText}>ISO 240 · F/1.8</Text>
          </View>
        </View>
      </CameraView>

      <ScrollView style={styles.bottomSheet} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.primaryBtn} onPress={takePhoto}>
          <MaterialIcons name="qr-code-scanner" color={colors.textDark} size={20} />
          <Text style={styles.primaryBtnText}>Barkodu Tara</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn}>
          <MaterialIcons name="keyboard" color={colors.gold} size={18} />
          <Text style={styles.secondaryBtnText}>Manuel Numara Gir</Text>
        </TouchableOpacity>

        <View style={styles.supportedSection}>
          <Text style={styles.supportedTitle}>Desteklenen Şans Oyunları</Text>
          <View style={styles.chipRow}>
            <Text style={styles.countryLabel}>TÜRKİYE</Text>
            {LOTTERIES.filter((l) => l.country === 'TR').map((l) => (
              <View key={l.label} style={styles.chip}>
                <Text style={styles.chipText}>{l.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.chipRow}>
            <Text style={styles.countryLabel}>AVRUPA</Text>
            {LOTTERIES.filter((l) => l.country === 'EU').map((l) => (
              <View key={l.label} style={styles.chip}>
                <Text style={styles.chipText}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  camera: { height: 340 },
  overlay: { flex: 1, justifyContent: 'space-between', padding: spacing.md },
  topInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 44 },
  qualityBadge: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  qualityText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  camBtn: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: radius.full },
  reticle: {
    alignSelf: 'center', width: 220, height: 120,
    alignItems: 'center', justifyContent: 'center',
  },
  corner: { position: 'absolute', width: 22, height: 22, borderColor: colors.gold, borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  hint: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center', letterSpacing: 2 },
  bottomInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  bottomInfoText: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  bottomSheet: { flex: 1, backgroundColor: colors.bgPrimary, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.accent, borderRadius: radius.lg, paddingVertical: 14, marginBottom: spacing.sm,
  },
  primaryBtnText: { color: colors.textDark, fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.bgCard, borderRadius: radius.lg, paddingVertical: 13,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  secondaryBtnText: { color: colors.gold, fontSize: 14, fontWeight: '600' },
  supportedSection: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  supportedTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 8 },
  countryLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginRight: 2 },
  chip: { backgroundColor: colors.bgLayer2, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  chipText: { color: colors.textSecondary, fontSize: 12 },
  permText: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  permBtn: { backgroundColor: colors.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.lg },
  permBtnText: { color: colors.textDark, fontSize: 14, fontWeight: '700' },
});
