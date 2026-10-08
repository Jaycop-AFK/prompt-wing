import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { PACE_PRESETS_SEC_PER_KM } from '@/components/community/copy';
import { formatPace } from '@/components/format';
import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  validateRaceEventInput,
  validateRunBuddyInput,
  type CreateRaceEventInput,
  type CreateRunBuddyInput,
} from '@/services/community';
import { persistCommunityImage } from '@/storage/community-media';

function dateInput(daysAhead: number): string {
  const date = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function CreateEventModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (input: CreateRaceEventInput) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [date, setDate] = useState(dateInput(7));
  const [time, setTime] = useState('06:00');
  const [venue, setVenue] = useState('');
  const [province, setProvince] = useState('กรุงเทพมหานคร');
  const [distance, setDistance] = useState('5');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const input: CreateRaceEventInput = {
      name,
      date,
      time,
      venue,
      province,
      distanceKm: Number(distance),
      description,
    };
    const error = validateRaceEventInput(input);
    if (error) return Alert.alert('ตรวจข้อมูลอีกครั้ง', error);
    setSaving(true);
    try {
      await onCreate(input);
      setName('');
      setVenue('');
      setDescription('');
      onClose();
    } catch {
      Alert.alert('สร้างอีเวนต์ไม่สำเร็จ', 'ลองใหม่อีกครั้ง');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CommunityModal visible={visible} title="สร้างอีเวนต์วิ่ง" onClose={onClose}>
      <Field label="ชื่ออีเวนต์" value={name} onChangeText={setName} placeholder="เช่น Sunday Easy Run" />
      <View style={styles.twoColumns}>
        <View style={styles.column}><Field label="วันที่" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" /></View>
        <View style={styles.column}><Field label="เวลา" value={time} onChangeText={setTime} placeholder="HH:MM" /></View>
      </View>
      <Field label="จุดนัดพบ" value={venue} onChangeText={setVenue} placeholder="เช่น สวนลุมพินี ประตู 3" />
      <View style={styles.twoColumns}>
        <View style={styles.column}><Field label="จังหวัด" value={province} onChangeText={setProvince} /></View>
        <View style={styles.column}><Field label="ระยะ (กม.)" value={distance} onChangeText={setDistance} keyboardType="decimal-pad" /></View>
      </View>
      <Field label="รายละเอียด" value={description} onChangeText={setDescription} placeholder="รูปแบบการวิ่ง pace และสิ่งที่ควรเตรียม" multiline />
      <Button label={saving ? 'กำลังสร้าง…' : 'สร้างอีเวนต์'} onPress={submit} disabled={saving} />
      <AppText variant="caption" tone="faint" align="center">อีเวนต์ที่สร้างในโหมดต้นแบบจะบันทึกไว้ในเครื่องนี้</AppText>
    </CommunityModal>
  );
}

export function CreateBuddyModal({
  visible,
  defaultName,
  onClose,
  onCreate,
}: {
  visible: boolean;
  defaultName: string;
  onClose: () => void;
  onCreate: (input: CreateRunBuddyInput) => Promise<void>;
}) {
  const { colors } = useTheme();
  const [displayName, setDisplayName] = useState(defaultName);
  const [meetingPlace, setMeetingPlace] = useState('');
  const [runTime, setRunTime] = useState('พรุ่งนี้ · 06:00 น.');
  const [pace, setPace] = useState(390);
  const [message, setMessage] = useState('');
  const [capacity, setCapacity] = useState('5');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (defaultName && !displayName) setDisplayName(defaultName);
  }, [defaultName, displayName]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('ต้องอนุญาตเข้าถึงรูปภาพ', 'เปิดสิทธิ์รูปภาพให้พร้อมวิ่ง แล้วลองเลือกใหม่');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.78,
    });
    if (!result.canceled && result.assets[0]?.uri) setImageUri(result.assets[0].uri);
  };

  const submit = async () => {
    const input: CreateRunBuddyInput = {
      displayName,
      meetingPlace,
      runTime,
      paceSecPerKm: pace,
      message,
      capacity: Number(capacity),
      imageUri,
    };
    const error = validateRunBuddyInput(input);
    if (error) return Alert.alert('ตรวจข้อมูลอีกครั้ง', error);
    setSaving(true);
    try {
      const persistentImage = imageUri ? await persistCommunityImage(imageUri) : null;
      await onCreate({ ...input, imageUri: persistentImage });
      setMeetingPlace('');
      setMessage('');
      setImageUri(null);
      onClose();
    } catch {
      Alert.alert('โพสต์ไม่สำเร็จ', 'ลองใหม่อีกครั้ง');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CommunityModal visible={visible} title="โพสต์หาเพื่อนวิ่ง" onClose={onClose}>
      <Field label="ชื่อที่แสดง" value={displayName} onChangeText={setDisplayName} placeholder="ชื่อเล่นหรือชื่อกลุ่ม" />
      <Field label="อยากชวนวิ่งแบบไหน" value={message} onChangeText={setMessage} placeholder="เช่น easy 5K มือใหม่มาด้วยกันได้" multiline />
      <Field label="สถานที่นัดพบ" value={meetingPlace} onChangeText={setMeetingPlace} placeholder="ระบุประตูหรือจุดสังเกตให้ชัด" />
      <Field label="วันและเวลา" value={runTime} onChangeText={setRunTime} placeholder="เช่น วันเสาร์ · 06:00 น." />
      <AppText variant="small" tone="muted">pace ที่อยากวิ่ง</AppText>
      <View style={styles.chips}>
        {PACE_PRESETS_SEC_PER_KM.map((value) => {
          const active = value === pace;
          return <ChoiceChip key={value} label={`${formatPace(value)} /กม.`} active={active} onPress={() => setPace(value)} />;
        })}
      </View>
      <Field label="รับทั้งหมดกี่คน" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />
      <Pressable onPress={pickImage} accessibilityRole="button" style={styles.photoButton}>
        <Ionicons name="image-outline" size={20} color={colors.brand} />
        <AppText variant="small" weight="semibold">{imageUri ? 'เปลี่ยนรูปที่แนบ' : 'แนบรูปจากมือถือ'}</AppText>
      </Pressable>
      {imageUri ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
          <Pressable
            onPress={() => setImageUri(null)}
            accessibilityLabel="นำรูปออก"
            style={[styles.removePhoto, { backgroundColor: colors.text }]}>
            <Ionicons name="close" size={18} color={colors.background} />
          </Pressable>
        </View>
      ) : null}
      <Button label={saving ? 'กำลังโพสต์…' : 'โพสต์หาเพื่อน'} onPress={submit} disabled={saving} />
    </CommunityModal>
  );
}

function CommunityModal({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="ปิดหน้าต่าง" />
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={styles.sheetHeader}>
            <AppText variant="heading" weight="bold">{title}</AppText>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="ปิด">
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, multiline = false, ...props }: React.ComponentProps<typeof TextInput> & { label: string; multiline?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <AppText variant="small" tone="muted">{label}</AppText>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={colors.textFaint}
        style={[styles.input, multiline && styles.multiline, { color: colors.text, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
      />
    </View>
  );
}

function ChoiceChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: active ? colors.brandSoft : colors.surfaceAlt, borderColor: active ? colors.brand : colors.border }]}>
      <AppText variant="small" weight="semibold" color={active ? colors.brandStrong : colors.textMuted}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.48)' },
  sheet: { maxHeight: '91%', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: spacing.lg },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  form: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl, gap: spacing.md },
  field: { gap: spacing.xs },
  input: { minHeight: 46, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15 },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  twoColumns: { flexDirection: 'row', gap: spacing.sm },
  column: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  photoButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  previewWrap: { height: 180, borderRadius: radius.md, overflow: 'hidden' },
  preview: { flex: 1 },
  removePhoto: { position: 'absolute', top: spacing.sm, right: spacing.sm, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', opacity: 0.86 },
});
