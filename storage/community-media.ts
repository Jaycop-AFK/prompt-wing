import { Platform } from 'react-native';

/**
 * ImagePicker คืนไฟล์ใน cache ซึ่งระบบปฏิบัติการล้างได้ จึงคัดลอกเข้า document directory ก่อน
 * เก็บ URI ลง AsyncStorage บน web ไม่มี document directory แบบ native จึงใช้ URI ที่ browser คืนมา
 */
export async function persistCommunityImage(uri: string): Promise<string> {
  if (Platform.OS === 'web') return uri;

  const { Directory, File, Paths } = await import('expo-file-system');
  const directory = new Directory(Paths.document, 'community-posts');
  if (!directory.exists) directory.create({ idempotent: true, intermediates: true });

  const source = new File(uri);
  const extension = source.extension || '.jpg';
  const destination = new File(directory, `buddy-${Date.now()}${extension}`);
  await source.copy(destination);
  return destination.uri;
}
