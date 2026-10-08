# Mock smartwatch simulation for Prompt Wing

Research date: 2026-09-03  
Scope: Expo SDK 54 / Expo Go prototype only. This note does not describe a real wearable connection.

## Recommendation

Build a clearly labelled **โหมดจำลองนาฬิกา (ไม่มีการเชื่อมต่ออุปกรณ์จริง)** with three layers:

1. A small deterministic JavaScript simulator owns connection state and generated sensor samples.
2. AsyncStorage persists the selected mock device and latest demo snapshot.
3. Skia + Reanimated render a rotating 2.5D watch, pulse ring, and heartbeat trace.

This meets the requirement to demonstrate how a supplemental device could provide heart-rate and running data without claiming Bluetooth, Apple Health, Garmin Connect, HealthKit, or Health Connect access.

## Expo Go-compatible rendering

- Expo SDK 54 includes `@shopify/react-native-skia` in Expo Go and recommends version `2.2.12`, which is already installed in this repo. [Expo SDK 54 Skia documentation](https://docs.expo.dev/versions/v54.0.0/sdk/skia/)
- Expo SDK 54 includes Reanimated in Expo Go and recommends `~4.1.1`; it is already installed in this repo. [Expo SDK 54 Reanimated documentation](https://docs.expo.dev/versions/v54.0.0/sdk/reanimated/)
- Skia provides a Canvas root for drawing shapes and custom graphics. A watch can therefore be drawn procedurally from rounded rectangles, circles, gradients, a crown, screen content, and highlights rather than depending on a licensed 3D model. [Skia Canvas overview](https://shopify.github.io/react-native-skia/docs/canvas/overview/)
- Skia groups support transforms, while its animation integration accepts Reanimated shared and derived values directly and runs animation work on the UI thread. This supports idle rotation, drag-to-rotate, pulse glow, and heart-trace motion without React state updates on every frame. [Skia groups and transforms](https://shopify.github.io/react-native-skia/docs/group/), [Skia animations](https://shopify.github.io/react-native-skia/docs/animations/animations/)
- Skia documents `processTransform3d` with perspective and `rotateY`, so a 2.5D watch can visually rotate even though it is not a true mesh model. [Skia animation hooks](https://shopify.github.io/react-native-skia/docs/animations/hooks/)

### True 3D fallback

If a real mesh becomes mandatory, Expo SDK 54 includes `expo-gl ~16.0.10` in Expo Go and describes it as an OpenGL ES target for 2D/3D graphics; Expo also names `expo-three` as a higher-level integration. However, GLView does not work properly with remote debugging, third-party Three.js cannot run inside a Reanimated worklet, assets must load on the main thread, and rendering loops must use `requestAnimationFrame`. For this prototype, the procedural Skia 2.5D watch is lower risk and easier to keep smooth. [Expo SDK 54 GLView documentation](https://docs.expo.dev/versions/v54.0.0/sdk/gl-view/)

## Persistence

- Expo SDK 54 includes AsyncStorage `2.2.0` in Expo Go, already matching this repo. It is asynchronous, persistent, **unencrypted** key-value storage. It is appropriate for mock device choice, demo connection preference, and fake last readings, but not for real health data, credentials, or access tokens. [Expo SDK 54 AsyncStorage documentation](https://docs.expo.dev/versions/v54.0.0/sdk/async-storage/)
- AsyncStorage stores strings, so persist structured state with `JSON.stringify` and validate/parse it when reading. [AsyncStorage usage documentation](https://react-native-async-storage.github.io/2.0/Usage/)

Suggested persisted record:

```ts
type MockWatchState = {
  schemaVersion: 1;
  deviceId: 'mock-apple-watch' | 'mock-garmin' | 'mock-generic';
  connection: 'disconnected' | 'connecting' | 'connected';
  connectedAt: string | null;
  lastSnapshot: MockHealthSnapshot | null;
};
```

On app relaunch, do not pretend a radio connection survived. Restore the selected device, but show either `พร้อมจำลอง` or reconnect through a short simulated connection flow.

## Reasonable demo metrics

The following fields map to real categories documented by platform owners, but all values in this mode must remain synthetic:

| Metric | Unit / shape | Why it is reasonable |
|---|---|---|
| Heart rate | bpm | Apple HealthKit and Android Health Connect both model heart rate; Garmin Health API also exposes it. |
| Resting heart rate | bpm, daily | Health Connect documents a daily resting-heart-rate value. |
| Steps | count | HealthKit, Health Connect, and Garmin Health API all model steps. |
| Cadence | steps/min | Health Connect documents `StepsCadence` for exercise. |
| Distance | km | HealthKit documents walking/running distance; Health Connect documents distance during exercise. |
| Speed / pace | km/h and min/km | HealthKit documents running speed; Health Connect documents exercise speed. |
| Active calories | kcal | HealthKit and Health Connect model active energy/calories. |
| Blood oxygen | percent | Health Connect documents oxygen saturation; Garmin calls the category Pulse Ox. |
| Battery | percent | Device-demo UI field only; not a health measurement. |
| Signal / last sync | label / timestamp | Simulation-status fields only; they must not imply a real radio or cloud sync. |

Sources: [Apple HealthKit data types](https://developer.apple.com/documentation/healthkit/data-types), [Apple HealthKit authorization example](https://developer.apple.com/documentation/HealthKit/authorizing-access-to-health-data), [Android Health Connect write-data guidance](https://developer.android.com/health-and-fitness/health-connect/write-data), [Garmin Health API](https://developer.garmin.com/gc-developer-program/health-api/).

Avoid medical-looking metrics such as ECG interpretation, arrhythmia alerts, blood pressure diagnosis, stress diagnosis, or recovery recommendations. They are unnecessary for the stated running-demo requirement and make a fake feed easier to misunderstand as medical output.

## Suggested simulation behavior

This is an implementation recommendation inferred from the platform data shapes above, not a platform requirement:

- Device picker: `Apple Watch (จำลอง)`, `Garmin (จำลอง)`, and `นาฬิกาทั่วไป (จำลอง)`.
- Connection state machine: `disconnected -> connecting (about 1.2–2.0 seconds) -> connected`; include cancel and disconnect.
- Generate data from a seeded pseudo-random function so tests and demos are repeatable.
- Update the display once per second, but keep the underlying value changes plausible and smooth rather than independent random jumps.
- While idle: heart rate around a configurable resting baseline, zero cadence, and no accumulating distance.
- While running: heart rate trends toward an effort-based target; cadence, speed, distance, and calories move together from the same simulated effort value.
- When paused: cadence and speed trend to zero; distance stops; heart rate decays gradually.
- Introduce a rare explicit `สัญญาณจำลองขาดหาย` state instead of silently emitting zero. Android specifically warns that zero should mean true inactivity and missing/off-body data should be omitted, which is a useful rule for the mock too. [Android Health Connect zero-value guidance](https://developer.android.com/health-and-fitness/health-connect/write-data)

Every metric card and saved session sourced from the simulator should carry `ข้อมูลจำลอง` or `จากนาฬิกาจำลอง`; do not use a Bluetooth icon plus the word `เชื่อมต่อแล้ว` without the mock label.

## Hard boundary versus real integrations

### Apple Watch / Apple Health

- Real Watch Connectivity transfers data between an iOS companion app and its paired watchOS app and Apple says its sample must be tested using a physical iPhone and Apple Watch. This requires native/watchOS targets; it is not the mock flow and is outside Expo Go. [Apple Watch Connectivity](https://developer.apple.com/documentation/watchconnectivity), [Apple physical-device sample](https://developer.apple.com/documentation/watchconnectivity/transferring-data-with-watch-connectivity)
- Real HealthKit access requires enabling the HealthKit capability, adding purpose strings, and requesting fine-grained permission for each data type. [Apple HealthKit authorization](https://developer.apple.com/documentation/HealthKit/authorizing-access-to-health-data)

### Android / Health Connect

- Real Health Connect access requires the native Health Connect SDK, manifest permissions, and a system permission request; permissions can be granted or revoked by the user. [Health Connect setup](https://developer.android.com/health-and-fitness/health-connect/get-started), [Health Connect permissions](https://developer.android.com/health-and-fitness/health-connect/ui/permissions)

### Garmin

- Garmin's Health API receives JSON after a user consents and syncs a supported device through Garmin Connect. Production access requires program approval, and commercial use requires a license fee. A local selector must therefore be labelled as a Garmin-style mock, not a Garmin API connection. [Garmin Health API](https://developer.garmin.com/gc-developer-program/health-api/)

### Expo Go boundary

Expo Go has a fixed set of native libraries. A library containing native code that is not bundled into Expo Go cannot be added by JavaScript alone; a development build is required. Therefore this feature should request **no Bluetooth, HealthKit, or Health Connect permissions** in mock mode. [Expo development-build FAQ](https://docs.expo.dev/develop/development-builds/faq/), [Expo custom native code guidance](https://docs.expo.dev/workflow/customizing/)

## Acceptance checks

- The screen visibly says `โหมดจำลอง` before the user chooses a device.
- Each watch choice includes `(จำลอง)` and does not use official product artwork or trademarked UI.
- Connect, cancel, reconnect, disconnect, app reload, run, pause, and stop produce deterministic states.
- No Bluetooth, HealthKit, Health Connect, Garmin login, or operating-system health permission appears.
- A disconnected watch cannot generate or attach samples to a run.
- Values are internally consistent: no distance growth at zero speed, no cadence while paused, and missing data is not represented as a real zero measurement.
- Persistence contains no secrets and tolerates corrupted or older JSON by falling back to a safe disconnected state.
- Animation has a static/reduced-motion fallback and does not block connection controls or metric updates.
