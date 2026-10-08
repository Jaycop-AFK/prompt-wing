# Welcome to your Expo app 👋

## พร้อมวิ่ง: เปิดบนมือถือ

โปรเจกต์กำลังใช้ Expo SDK 57 ต้องใช้ Expo Go ที่รองรับ SDK 57 จาก https://expo.dev/go

```powershell
npm install
npm run go
```

คอมและมือถือใช้ Wi-Fi เดียวกัน แล้วสแกน QR ใหม่ คำสั่ง `npm run go` จะเลือก IP ของ Wi-Fi แทน Radmin VPN, Tailscale และอะแดปเตอร์เครื่องเสมือนโดยอัตโนมัติ ถ้าอยู่คนละเครือข่ายใช้ `npm run go:tunnel` ซึ่งเปิด Cloudflare Quick Tunnel บัญชีใน Expo Go ต้องตรงกับผลลัพธ์ของ `npx expo whoami` เพราะ Expo CLI เซ็น manifest ด้วยบัญชีที่ล็อกอินอยู่ หากต้องการแจกให้ผู้ทดสอบใช้บัญชีของตัวเอง ต้องสร้าง Development Build แทน Expo Go หยุด Metro รุ่นเก่าด้วย Ctrl+C ก่อนเริ่มคำสั่งใหม่

Apple Health / Health Connect ใช้ใน Expo Go ไม่ได้ ต้องสร้าง Development Build ใหม่ ส่วนฟีเจอร์ทั่วไปยังใช้ Expo Go ได้ SDK 57 รองรับ iOS 16.4 ขึ้นไป

หากติดตั้งบนเครื่องนี้โดยข้าม Skia native download เพื่อใช้ Expo Go แล้วต้องการคอมไพล์ native ในเครื่องภายหลัง ให้รัน `npm rebuild @shopify/react-native-skia` โดยไม่ตั้ง `SKIP_SKIA_DOWNLOAD` เพื่อดาวน์โหลดไฟล์ native ให้ครบก่อน EAS Build จะติดตั้ง dependencies ในสภาพแวดล้อมของตัวเอง

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
