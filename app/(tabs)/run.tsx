import { ComingSoon } from '@/components/ui/coming-soon';
import { Screen } from '@/components/ui/screen';

export default function RunScreen() {
  return (
    <Screen title="วิ่ง">
      <ComingSoon ticket="10">
        ตั้งเป้าหมายรอบนี้เป็นระยะทาง เวลา หรือแคลอรี แล้วดูสรุปก่อนเริ่มวิ่ง
        วันที่ใบอนุญาตเป็นสีเหลืองระบบจะลดเป้าหมายรอบนี้ให้พร้อมบอกเหตุผล
      </ComingSoon>

      <ComingSoon ticket="11">
        หน้าวิ่งจริง พร้อม GPS แผนที่ pace สด และปุ่มล็อกหน้าจอ
      </ComingSoon>
    </Screen>
  );
}
