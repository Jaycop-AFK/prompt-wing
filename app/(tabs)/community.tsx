import { ComingSoon } from '@/components/ui/coming-soon';
import { MockBadge } from '@/components/ui/mock-badge';
import { Screen } from '@/components/ui/screen';

export default function CommunityScreen() {
  return (
    <Screen title="ชุมชน" headerRight={<MockBadge />}>
      <ComingSoon ticket="19">
        ปฏิทินงานวิ่งไทย ดูวันที่ ระยะทาง จังหวัด และค่าสมัคร
      </ComingSoon>

      <ComingSoon ticket="19">
        หาเพื่อนวิ่งที่วิ่งสวนเดียวกัน เวลาใกล้กัน และ pace ใกล้กัน
      </ComingSoon>
    </Screen>
  );
}
