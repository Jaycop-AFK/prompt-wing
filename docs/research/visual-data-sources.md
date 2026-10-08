# แหล่งข้อมูลและภาพเวกเตอร์สำหรับ Prompt Wing

สถานะการวิจัย: 2 กันยายน 2026  
ขอบเขต: แอป Expo SDK 54 ที่ต้องเปิดได้ใน Expo Go, แหล่งข้อมูลสภาพอากาศ/คุณภาพอากาศ/สถานที่/เส้นทาง และภาพเวกเตอร์ที่นำมาเก็บในโปรเจกต์ได้  
วิธีตรวจสอบ: ใช้เฉพาะเอกสารของ Expo, เจ้าของ API, เจ้าของชุดภาพ และเจ้าของข้อมูลโดยตรง

## ข้อเสนอที่ควรใช้

1. ใช้ **Ionicons ชุดเดิม** สำหรับปุ่มและสถานะทั้งหมด อย่าเพิ่ม icon set อีกชุด เพราะมีอยู่แล้วใน `@expo/vector-icons` และภาษาภาพจะสม่ำเสมอ
2. ใช้ **Open Doodles/Open Peeps (CC0)** ทำตัวละครนักวิ่ง/ผู้ใช้ และเก็บ SVG ที่เลือกไว้ในโปรเจกต์ ไม่โหลดจากเว็บตอนเปิดหน้า
3. หน้าที่มีข้อมูลจริงควรใช้ภาพที่อธิบายข้อมูล ได้แก่ แผนที่ย่อ เส้นทาง กราฟ วงแหวนเป้าหมาย ไอคอนอากาศ/AQI และภาพท่าวอร์มอัพ มากกว่าภาพตกแต่งทั่วไป
4. คง Open-Meteo สำหรับต้นแบบ แต่ต้องใส่เครดิตและเปลี่ยนแผนเมื่อแอปมีโฆษณา/สมาชิกแบบเสียเงิน ส่วน Overpass และ GraphHopper ต้องผ่าน backend พร้อม cache ก่อนใช้งานจริง
5. เพิ่มหน้า `เครดิตและแหล่งข้อมูล` ใน Settings และวางเครดิตแบบสั้นใกล้ข้อมูลที่แสดง โดยเฉพาะแผนที่ อากาศ AQI และเส้นทาง

## แหล่งข้อมูล

### Open-Meteo: อากาศและ AQI ที่ใช้อยู่

โค้ดปัจจุบันเรียก Weather API และ Air Quality API โดยตรงใน [`services/open-meteo.ts`](../../services/open-meteo.ts)

- Weather API ให้ current/hourly/daily forecast จากหลายแบบจำลองทั่วโลกและไม่ต้องใช้ key บน free endpoint ([เอกสาร Weather API](https://open-meteo.com/en/docs))
- ข้อมูล API อยู่ภายใต้ **CC BY 4.0**: ต้องให้เครดิต ลิงก์ไปยังสัญญาอนุญาต และระบุหากมีการแก้ไขข้อมูล ([Open-Meteo Licence](https://open-meteo.com/en/license))
- Free API ใช้ได้เฉพาะ non-commercial และจำกัดต่ำกว่า 600 calls/นาที, 5,000/ชั่วโมง และ 10,000/วัน แอปที่มีโฆษณา ค่าสมาชิก หรือเป็นผลิตภัณฑ์เชิงพาณิชย์ต้องใช้แผน commercial ([Open-Meteo Terms](https://open-meteo.com/en/terms), [Pricing](https://open-meteo.com/en/pricing))
- AQI สำหรับประเทศไทยมาจาก CAMS global model ความละเอียดราว 45 กม. ข้อมูลต้นทางเป็นช่วงทุก 3 ชั่วโมงและอัปเดตทุก 12 ชั่วโมง จึงต้องเขียนว่า **“ค่าคาดการณ์จากแบบจำลอง”** ไม่ใช่ค่าจากสถานีใกล้ตัว และต้องให้เครดิตทั้ง Open-Meteo กับ CAMS ([Air Quality API](https://open-meteo.com/en/docs/air-quality-api))
- Free API ไม่มี uptime guarantee จึงต้องมี cache และสถานะ “ข้อมูลล่าสุดเมื่อ…” แทนการทำให้หน้าหลักล้มเมื่อ API ใช้งานไม่ได้ ([Open-Meteo Terms](https://open-meteo.com/en/terms))

ข้อความเครดิตแนะนำ:

> ข้อมูลอากาศ: Open-Meteo (CC BY 4.0) · คุณภาพอากาศ: CAMS via Open-Meteo

คำแนะนำ cache: เก็บผลตามพิกัดปัดเศษและช่วงเวลา 10–15 นาทีสำหรับ weather UI; AQI ไม่ต้องเรียกถี่กว่ารอบ refresh ของหน้า เพราะข้อมูลประเทศไทยมีความละเอียดเชิงพื้นที่/เวลาหยาบกว่าพิกัด GPS มาก

ข้อควรแจ้งด้านความเป็นส่วนตัว: free endpoint ระบุว่าอาจเก็บ web-server logs ที่มี IP และพิกัดใน URL เพื่อแก้ปัญหา และลบ log รายบุคคลภายใน 90 วัน จึงควรระบุผู้ประมวลผลนี้ใน Privacy Notice ([Open-Meteo Terms](https://open-meteo.com/en/terms))

### TMD และ Air4Thai: แหล่งราชการไทย

- กรมอุตุนิยมวิทยามี API พยากรณ์ตามพิกัดและข้อมูลสถานี เช่น hourly forecast ได้สูงสุด 48 ชั่วโมง แต่ต้องลงทะเบียนและส่ง OAuth Bearer token ([TMD API](https://data.tmd.go.th/api/index1.php), [Hourly location API](https://data.tmd.go.th/nwpapi/doc/apidoc/location/forecast_hourly.html))
- เอกสารสาธารณะระบุ HTTP 429 แต่ไม่ระบุตัวเลข rate limit ที่แน่นอน และรายการข้อมูลระบุเพียง “Creative Commons Attributions” โดยไม่ชี้เวอร์ชันชัดเจน จึงควรยืนยันเงื่อนไขกับ TMD ก่อนใช้เชิงพาณิชย์
- ห้ามฝัง TMD bearer token ใน Expo bundle; ถ้าจะเพิ่มคำเตือนฝน/พายุของไทย ให้เรียกผ่าน Supabase Edge Function หรือ backend
- Air4Thai ของกรมควบคุมมลพิษเหมาะเป็นแหล่งอ้างอิงค่าจากสถานีจริง ([Air4Thai](https://air4thai.pcd.go.th/)) แต่ยังไม่พบสัญญา public API ทางการที่ระบุ endpoint, authentication, SLA, rate limit และสิทธิ์นำข้อมูลสดไปเผยแพร่ จึงไม่ควร scrape endpoint ที่ไม่ได้ประกาศ ใช้ deep link ไป Air4Thai หรือขอสิทธิ์/สัญญา API จากกรมก่อน ([คู่มือบริการของกรมควบคุมมลพิษ](https://www.pcd.go.th/wp-content/uploads/2024/04/pcdnew-2024-04-26_02-01-12_124272.pdf))

### OpenStreetMap และ Overpass: สถานที่วิ่งและสิ่งอำนวยความสะดวก

โค้ดปัจจุบันค้น POI ผ่าน [`services/overpass.ts`](../../services/overpass.ts)

- OSM เหมาะกับถนน ทางเท้า สวน สนามวิ่ง ห้องน้ำ จุดน้ำดื่ม ไฟส่องสว่าง และ POI; ใช้เชิงพาณิชย์ได้ภายใต้ ODbL แต่ต้องแสดงคำว่า **OpenStreetMap** อย่างอ่านได้และเข้าถึงข้อมูลสัญญาอนุญาตได้ โดยทั่วไปลิงก์ไป [`openstreetmap.org/copyright`](https://www.openstreetmap.org/copyright) ([OSMF Attribution Guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines))
- หากแจกจ่ายฐานข้อมูลอนุพันธ์ อาจเกิดข้อกำหนด share-alike ของ ODbL; ภาพแผนที่ที่ render แล้วเป็น Produced Work แต่ยังต้องให้เครดิตข้อมูล
- public Overpass instance มีไว้สำหรับงานเล็กและอาจ overload เอกสารปัจจุบันแนะนำงานที่เรียกสม่ำเสมอให้อยู่ประมาณไม่เกิน 100 queries และ 10 MB ต่อวันโดยนับรวมผู้ใช้ทั้งแอป ต้องใส่ `User-Agent`/`Referer` ที่ระบุตัวแอป, cache, rate-limit, เรียกทีละคำขอ และหยุด 30 วินาทีหลัง 429/406 ([Overpass API instances](https://wiki.openstreetmap.org/wiki/Overpass_API), [operator quota behavior](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html))
- สำหรับ production ให้ backend ดึงและ cache POI เป็นรายพื้นที่ หรือใช้ paid/self-hosted Overpass; ห้ามให้มือถือทุกเครื่องยิง public instance ทุกครั้งที่เลื่อนแผนที่
- ถ้าใช้ tile server ของ OSMF ต้องใช้ URL ที่กำหนด, แสดง attribution บนแผนที่, ใช้ User-Agent ที่ระบุแอป, เคารพ cache headers/เก็บอย่างน้อย 7 วัน และห้าม bulk download, offline packs, prefetch หรือหลบ cache; เป็นบริการ best-effort ไม่มี SLA ([OSMF Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/))

คำแนะนำ cache: cache venue ตาม grid/geohash และชนิดสถานที่อย่างน้อย 24 ชั่วโมง; refresh เมื่อผู้ใช้กดเองหรือย้ายออกนอกพื้นที่เดิม ไม่ refresh ตามทุกการเคลื่อนกล้อง

### GraphHopper: route generation และ map matching

โค้ดปัจจุบันใช้ GraphHopper ใน [`services/graphhopper-routing.ts`](../../services/graphhopper-routing.ts) และ [`services/graphhopper-map-matching.ts`](../../services/graphhopper-map-matching.ts)

- ทุก request ต้องใช้ API key; API รองรับ routing, round trip และ map matching ([GraphHopper API Explorer](https://docs.graphhopper.com/openapi/section/explore-our-apis/api-explorer))
- Free plan ไม่ใช่แผน production เชิงพาณิชย์ทั่วไป; Terms ระบุว่าการใช้ Free เชิงพาณิชย์ใน production ต้องสอบถาม GraphHopper ก่อน ([Pricing](https://www.graphhopper.com/pricing/), [Terms §5](https://www.graphhopper.com/terms/))
- แผนที่ไม่มี white-label ต้องให้เครดิต GraphHopper และทุก package ต้องให้เครดิต OpenStreetMap หรืออยู่ภายใต้ TomTom EULA ตาม package ([Terms §3](https://www.graphhopper.com/terms/))
- ผลลัพธ์ cache ฝั่ง client ได้เพียงชั่วคราว; ห้าม mass download/scraping และการ redistribute API ต้องมี custom agreement ([Terms §5.2](https://www.graphhopper.com/terms/))
- Expo bundle เก็บ API key เป็นความลับไม่ได้ จึงควรย้าย routing/map matching ไป Supabase Edge Function พร้อม quota ต่อผู้ใช้ก่อนเผยแพร่จริง

คำแนะนำใช้งาน: route generator ควร cache ผลตาม start grid + ระยะ + profile; map matching ของ session ควรส่งหลังจบหรือเป็น batch ที่ห่างพอ ไม่ส่งทุก GPS sample แบบ real-time

## แหล่งภาพเวกเตอร์และเงื่อนไข

### 1. Ionicons — ตัวเลือกหลักสำหรับไอคอน UI

โปรเจกต์มี `@expo/vector-icons` และใช้งาน `Ionicons` อยู่แล้ว จึงไม่ต้องเพิ่ม dependency หรือดาวน์โหลด SVG แยก

- Ionicons ใช้ **MIT License** ใช้และแก้ไขในงานส่วนตัว/เชิงพาณิชย์ได้ แต่ต้องเก็บ copyright notice และ permission notice ไว้ในสำเนาหรือส่วนสำคัญของซอฟต์แวร์ ([Ionicons repository](https://github.com/ionic-team/ionicons), [LICENSE](https://github.com/ionic-team/ionicons/blob/main/LICENSE))
- brand icons ยังเป็นเครื่องหมายการค้าของเจ้าของแบรนด์และการมี glyph ไม่ได้ให้สิทธิ์ใช้ตราสินค้านอกการอ้างถึงบริการนั้น
- ให้เพิ่ม MIT notice ในหน้า “เครดิตและโอเพนซอร์ส” หรือไฟล์ third-party notices ของ release

เหมาะกับ: navigation, สภาพอากาศ, AQI, GPS, pace, ระยะ, เวลา, แคลอรี, favorite, calendar, share, lock และ control buttons

### 2. Open Peeps — ตัวละครนักวิ่งและ avatar

- เว็บไซต์เจ้าของผลงานระบุว่า library อยู่ใน public domain ภายใต้ **CC0** ใช้ส่วนตัว/เชิงพาณิชย์ คัดลอก ดัดแปลง แจกจ่าย และ remix ได้โดยไม่ต้องขออนุญาต ([Open Peeps](https://www.openpeeps.com/))
- ดาวน์โหลด SVG ทีละตัวจากหน้าเว็บหรือดาวน์โหลด library แล้วประกอบ pose/สีใน Figma; แม้ไม่บังคับเครดิต ควรเก็บ `SOURCE.md` ระบุ URL และวันที่ดาวน์โหลดเพื่อรักษาที่มาของ asset
- เหมาะกับ avatar เริ่มต้น, empty state ของชุมชน/ประวัติ และภาพคนหลากหลายรูปร่าง ไม่ควรใช้เป็นไอคอนควบคุม

### 3. Open Doodles — ภาพประกอบสถานะสำคัญที่เลือกใช้จริง

- เจ้าของผลงานระบุว่า Open Doodles เป็นงาน CC0 สามารถคัดลอก แก้ไข remix แชร์ และวาดใหม่เพื่อวัตถุประสงค์ใดก็ได้ ([Open Doodles About](https://www.opendoodles.com/about))
- โปรเจกต์เลือกใช้ Sprinting, Strolling และ Selfie จาก asset host ทางการ ปรับ accent เป็นสีเขียวของแบรนด์ และเก็บ local ใน `assets/illustrations/`
- เหมาะกับ hero ขนาดเล็กและ empty/loading state ไม่ควรใช้แทนไอคอนควบคุมหรือภาพที่ต้องอธิบายข้อมูลเฉพาะ

### 4. unDraw — ตัวเลือกสำรอง ไม่ได้บันเดิลในรอบนี้

- อนุญาตใช้ ดาวน์โหลด คัดลอก ดัดแปลง และใช้เชิงพาณิชย์โดยไม่ต้องให้เครดิต ([unDraw License](https://undraw.co/license))
- ห้ามรวบรวม/แจกจ่าย asset เป็น pack, ทำบริการที่แข่งขันหรือ integration สำหรับค้น/ฝัง/ดาวน์โหลด asset, scrape/ดาวน์โหลดอัตโนมัติ และห้ามนำไป train/fine-tune/test ระบบ AI/ML โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร
- เลือกดาวน์โหลด SVG ด้วยมือเพียง 3–5 ภาพ ปรับสี accent ให้ตรงแบรนด์ และเก็บ local; การใช้ภาพเป็นส่วนประกอบของหน้าจอแอปทำได้ แต่ asset ต้องไม่เป็นผลิตภัณฑ์หลักที่นำไปแจกต่อ
- หลีกเลี่ยงภาพที่มี brand logo เพราะโลโก้ยังเป็นเครื่องหมายการค้าของเจ้าของแต่ละราย

เหมาะกับ: login/onboarding, ไม่มีประวัติวิ่ง, GPS/เครือข่ายผิดพลาด และ success milestone

### 5. Heroicons, Lucide หรือ Phosphor — ทางเลือก ไม่ควรผสมใน release นี้

- Heroicons และ Phosphor ใช้ MIT; ต้องเก็บ copyright + permission notice ([Heroicons LICENSE](https://github.com/tailwindlabs/heroicons/blob/master/react/LICENSE), [Phosphor LICENSE](https://github.com/phosphor-icons/core/blob/main/LICENSE))
- Lucide ใช้ ISC และไอคอนที่สืบจาก Feather ใช้ MIT; ต้องเก็บ notice ที่เกี่ยวข้อง ([Lucide License](https://lucide.dev/license))
- ทั้งสามชุดเหมาะและ permissive แต่เพิ่มชุดใหม่จะทำให้ stroke, proportions และน้ำหนักภาพไม่สม่ำเสมอกับ Ionicons ที่มีอยู่ จึงควรใช้เฉพาะกรณี Ionicons ไม่มีสัญลักษณ์ที่จำเป็นจริง ๆ

## ใช้ SVG อย่างไรใน Expo SDK 54 / Expo Go

- `react-native-svg` เวอร์ชันที่ Expo SDK 54 แนะนำคือ 15.12.1, รองรับ Android/iOS/Web, interactivity และ animation และ **รวมอยู่ใน Expo Go** ([Expo SDK 54: react-native-svg](https://docs.expo.dev/versions/v54.0.0/sdk/svg/))
- สำหรับภาพ SVG ที่ต้องเปลี่ยนสีตาม theme หรือขยับเป็นส่วน ๆ ให้แปลงเป็น React component ที่ใช้ `Svg`, `Path`, `Circle` ฯลฯ; เก็บ `viewBox` ไว้เพื่อเลี่ยงปัญหา Android ตามคำแนะนำของ Expo
- `expo-image` เวอร์ชัน SDK 54 (`~3.0.11`) รวมอยู่ใน Expo Go, รองรับ SVG บน Android/iOS/Web, local `require()` และมี memory/disk caching สำหรับภาพ remote ([Expo SDK 54: Image](https://docs.expo.dev/versions/v54.0.0/sdk/image/))
- ใช้ `expo-image` กับภาพประกอบ static และกำหนด `contentFit="contain"`, ขนาดคงที่ และ `accessibilityLabel`; ใช้ `react-native-svg` กับภาพที่ต้อง theme/animate
- `expo-asset` รวมอยู่ใน Expo Go และ static asset ที่อ้างด้วย `require()` ทำงานกับระบบ asset ของ Expo ([Expo SDK 54: Asset](https://docs.expo.dev/versions/v54.0.0/sdk/asset/))
- ไม่ควร hotlink SVG จากเว็บชุดภาพ: UI จะพึ่งเครือข่าย, URL อาจเปลี่ยน, cache/สิทธิ์ควบคุมยาก และทำ offline state แย่ลง

โครงสร้างที่แนะนำ:

```text
assets/
  illustrations/
    runner-welcome.svg
    empty-history.svg
    gps-error.svg
  licenses/
    OPEN-PEEPS.md
    UNDRAW.md
    IONICONS-MIT.txt
components/
  illustrations/
    RunnerWelcome.tsx
    EmptyHistory.tsx
    GpsError.tsx
```

## ภาพที่ควรใส่ในแต่ละหน้า

| หน้า | ภาพที่ช่วยการใช้งาน | สิ่งที่ไม่ควรใส่ |
|---|---|---|
| Login | runner hero หนึ่งภาพ, โลโก้แอป | ภาพคนหลายภาพหรือ social logo ที่ไม่ใช่ปุ่ม OAuth จริง |
| หน้าหลัก | readiness ring, weather/AQI glyph, mini goal progress และภาพนักวิ่งเล็กหนึ่งภาพ | hero ใหญ่ที่ดันข้อมูลพร้อมวิ่งลงล่าง |
| ตั้งค่าการวิ่ง | pictogram 3 แบบสำหรับอิสระ/เป้าหมาย/โปรแกรม และ icon สำหรับ easy/tempo/interval | illustration เต็มการ์ดทุก option |
| วิ่งสด | แผนที่เต็มจอ, เส้น route, GPS accuracy halo, direction marker, icon ปุ่ม pause/finish | ภาพตกแต่งใด ๆ ที่บังแผนที่หรือสถิติ |
| วอร์มอัพ | silhouette/character เฉพาะแต่ละท่า, ลูกศรทิศทาง, progress ring | ภาพ generic fitness ที่ไม่บอกท่าจริง |
| สภาพอากาศ | icon ตาม weather code, แถบรายชั่วโมง, UV/AQI gauge และ sunrise/sunset arc | ใช้สีเพียงอย่างเดียวสื่อระดับความเสี่ยง |
| ที่วิ่ง | mini map/route thumbnail, icon amenity (น้ำ/ห้องน้ำ/ไฟ/พื้นผิว), ระยะจากผู้ใช้ | รูปสถานที่จาก Google/โซเชียลที่ไม่มีสิทธิ์นำมาใช้ |
| สร้างเส้นทาง | live map + loop preview + elevation sparkline | ภาพประกอบ runner ที่ไม่ช่วยตัดสินเส้นทาง |
| ประวัติ/สรุป | route thumbnail, pace/distance chart, split bars, goal ring, badge เมื่อทำสำเร็จ | badge ทุกกิจกรรมจนลดคุณค่าความสำเร็จ |
| ชุมชน/งานวิ่ง | organizer-owned banner พร้อม credit, avatar Open Peeps, calendar/location chips | ดึงภาพ event จากเว็บโดยไม่มีสิทธิ์หรือเครดิต |
| โปรไฟล์ | avatar, weekly goal ring, achievement badges จำนวนจำกัด | ภาพ stock ที่ไม่เกี่ยวกับข้อมูลผู้ใช้ |
| Empty/error/offline | ภาพ unDraw/Open Peeps หนึ่งภาพ + คำอธิบาย + action เดียว | ภาพ animation ใหญ่บนทุก error |

กฎลดความรก: หนึ่งหน้าควรมี visual anchor ใหญ่ไม่เกินหนึ่งจุด; การ์ดข้อมูลแต่ละใบใช้ icon เดียว; หน้าวิ่งสดและหน้าสรุปให้ data visualization เป็นพระเอก ไม่ใส่ illustration เพิ่ม

## ลำดับนำไปทำ

1. **P0 — ความถูกต้องและสิทธิ์:** เพิ่ม attribution ของ Open-Meteo/CAMS/OSM/GraphHopper และหน้า credits; ย้าย GraphHopper key ออกจาก client ก่อน production
2. **P0 — ภาพที่อธิบายข้อมูล:** weather icons, AQI/UV gauges, venue amenity icons, route thumbnails และ warm-up pose silhouettes
3. **P1 — ลด text wall:** ใช้ Open Doodles/Open Peeps แบบ local ใน login, empty history, GPS error และ milestone success รวมไม่เกิน 5 ภาพ
4. **P1 — cache:** weather 10–15 นาที, venue discovery ตามพื้นที่ 24 ชั่วโมง, route ตาม input; แสดง timestamp และ stale state
5. **P2 — ข้อมูลไทย:** เพิ่ม TMD warning ผ่าน backend; คุย PCD เพื่อขอ Air4Thai API/reuse terms ก่อนเชื่อมสถานีจริง
6. **ก่อน release:** ตรวจทุก asset มี `SOURCE.md`/license notice, ไม่มี hotlink, ไม่มีภาพ/โลโก้ที่สิทธิ์ไม่ชัด และทดสอบ light/dark, screen reader, reduced motion, Android/iOS/Web
