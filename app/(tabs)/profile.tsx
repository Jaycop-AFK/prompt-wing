import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ComingSoon } from '@/components/ui/coming-soon';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <Screen title="โปรไฟล์" headerRight={<ThemeToggle />}>
      <ComingSoon ticket="09">
        น้ำหนัก ส่วนสูง อายุ เพศ และ BMI พร้อมแถบบอกช่วง
        และเป้าหมายระยะยาวที่เปลี่ยนแล้วมีผลกับเป้าหมายรายวันทันที
      </ComingSoon>

      <Card>
        <AppText variant="heading" weight="semibold">
          ประวัติการวิ่ง
        </AppText>
        <AppText variant="body" tone="muted">
          ระยะทางรายสัปดาห์ รายเดือน และรายปี พร้อมแนวโน้มคะแนนฟอร์มการวิ่งย้อนหลัง
        </AppText>
        <Button
          label="ดูประวัติการวิ่ง"
          onPress={() => router.push('/run-history')}
          variant="secondary"
        />
      </Card>

      <ComingSoon ticket="18">หน้าเพิ่มเติม การแจ้งเตือน หน่วยการวัด และเกี่ยวกับเรา</ComingSoon>
    </Screen>
  );
}
