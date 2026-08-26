import { ComingSoon } from '@/components/ui/coming-soon';
import { Screen } from '@/components/ui/screen';

export default function VenuesScreen() {
  return (
    <Screen title="ที่วิ่ง">
      <ComingSoon ticket="15">
        แผนที่และรายการที่วิ่งใกล้ตัว ดึงจาก OpenStreetMap สดตามตำแหน่ง ใช้ได้ทุกจังหวัด
        พร้อมข้อมูลสิ่งอำนวยความสะดวกที่กรอกเองสำหรับที่วิ่งรอบ มจพ. ปราจีนบุรี
      </ComingSoon>

      <ComingSoon ticket="19">ปุ่มสร้างเส้นทางวงกลมตามระยะที่ขอ</ComingSoon>
    </Screen>
  );
}
