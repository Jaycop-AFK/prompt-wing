import { ComingSoon } from '@/components/ui/coming-soon';
import { Screen } from '@/components/ui/screen';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function ProfileScreen() {
  return (
    <Screen title="โปรไฟล์" headerRight={<ThemeToggle />}>
      <ComingSoon ticket="09">
        น้ำหนัก ส่วนสูง อายุ เพศ และ BMI พร้อมแถบบอกช่วง
        และเป้าหมายระยะยาวที่เปลี่ยนแล้วมีผลกับเป้าหมายรายวันทันที
      </ComingSoon>

      <ComingSoon ticket="14">ประวัติการวิ่งรายสัปดาห์ รายเดือน และรายปี</ComingSoon>

      <ComingSoon ticket="18">หน้าเพิ่มเติม การแจ้งเตือน หน่วยการวัด และเกี่ยวกับเรา</ComingSoon>
    </Screen>
  );
}
