import { StyleSheet, View } from 'react-native';

import { ComingSoon } from '@/components/ui/coming-soon';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <Screen title="พร้อมวิ่ง" headerRight={<ThemeToggle />}>
      <View style={styles.greeting}>
        <AppText variant="small" tone="muted">
          สวัสดีตอนเช้า
        </AppText>
        <AppText variant="title" weight="bold">
          พร้อมวิ่งหรือยัง
        </AppText>
      </View>

      <ComingSoon ticket="03">
        ใบอนุญาตวิ่งวันนี้ จะมาอยู่ตรงนี้ เป็นคำตัดสินสีเขียว เหลือง หรือแดง
        พร้อมประโยคบอกช่วงเวลาที่ควรวิ่ง
      </ComingSoon>

      <ComingSoon ticket="09">
        แถบความคืบหน้าเป้าหมายรายวัน ซึ่งเปลี่ยนตามเป้าหมายระยะยาวที่ผู้ใช้เลือกไว้
      </ComingSoon>

      <ComingSoon ticket="08">ปุ่มวอร์มอัพ ที่พาไปยังชุดท่าที่เลือกมาให้สำหรับวันนี้</ComingSoon>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { gap: spacing.xs },
});
