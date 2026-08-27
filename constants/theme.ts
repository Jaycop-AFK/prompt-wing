/**
 * ระบบสีและระยะของ พร้อมวิ่ง
 *
 * สีทุกสีในแอปต้องมาจากไฟล์นี้ที่เดียว ห้ามเขียนรหัสสีลงในจอโดยตรง
 * ไม่งั้นธีมมืดจะพังทีละจุดโดยไม่มีใครรู้
 */

export interface ThemeColors {
  /** สีหลักของแบรนด์ ใช้กับปุ่มหลักและสถานะที่ถูกเลือก */
  brand: string;
  brandStrong: string;
  /** พื้นอ่อนของแบรนด์ ใช้กับป้ายและพื้นหลังของชิป */
  brandSoft: string;
  /** สีตัวอักษรบนพื้นแบรนด์ */
  onBrand: string;

  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;

  text: string;
  textMuted: string;
  textFaint: string;

  /** สามสีของใบอนุญาตวิ่ง */
  clearGreen: string;
  clearYellow: string;
  clearRed: string;
  clearGreenSoft: string;
  clearYellowSoft: string;
  clearRedSoft: string;

  tabActive: string;
  tabInactive: string;

  /** พื้นของป้ายที่บอกว่าเป็นข้อมูลจำลอง */
  mockBadge: string;
  mockBadgeText: string;

  /** สีของตัวละครวอร์มอัพ ข้างใกล้สว่างกว่าข้างไกลเพื่อให้ดูออกว่าใช้ข้างไหน */
  characterStage: string;
  characterNear: string;
  characterFar: string;
  characterGlow: string;
  characterGround: string;
}

export interface AppTheme {
  dark: boolean;
  colors: ThemeColors;
}

export const lightTheme: AppTheme = {
  dark: false,
  colors: {
    brand: '#3FA34D',
    brandStrong: '#2E8B3C',
    brandSoft: '#E7F5E9',
    onBrand: '#FFFFFF',

    background: '#F4F6F4',
    surface: '#FFFFFF',
    surfaceAlt: '#F0F3F0',
    border: '#E2E7E3',

    text: '#16201A',
    textMuted: '#5F6C64',
    textFaint: '#93A099',

    clearGreen: '#2E9E5B',
    clearYellow: '#D99321',
    clearRed: '#D14343',
    clearGreenSoft: '#E4F4EA',
    clearYellowSoft: '#FBF0DC',
    clearRedSoft: '#FBE6E6',

    tabActive: '#3FA34D',
    tabInactive: '#93A099',

    mockBadge: '#EEF0F3',
    mockBadgeText: '#6B7280',

    characterStage: '#EDF3ED',
    characterNear: '#243329',
    characterFar: '#9FB3A6',
    characterGlow: '#3FA34D',
    characterGround: '#D8DED9',
  },
};

export const darkTheme: AppTheme = {
  dark: true,
  colors: {
    brand: '#3DD9A4',
    brandStrong: '#2FC08D',
    brandSoft: '#12302A',
    onBrand: '#04140F',

    background: '#0A0F0D',
    surface: '#141B19',
    surfaceAlt: '#1B2422',
    border: '#26312E',

    text: '#EEF3F1',
    textMuted: '#9BA9A3',
    textFaint: '#6B7B75',

    clearGreen: '#3DD9A4',
    clearYellow: '#E8B65A',
    clearRed: '#F0736F',
    clearGreenSoft: '#10302A',
    clearYellowSoft: '#2E2617',
    clearRedSoft: '#331B1B',

    tabActive: '#3DD9A4',
    tabInactive: '#6B7B75',

    mockBadge: '#232B2E',
    mockBadgeText: '#9BA9A3',

    characterStage: '#101815',
    characterNear: '#EEF3F1',
    characterFar: '#4E5E56',
    characterGlow: '#3DD9A4',
    characterGround: '#1F2926',
  },
};

/** ระยะห่างมาตรฐาน ใช้ตัวคูณของ 4 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/**
 * ตระกูลฟอนต์ไทย
 *
 * ใช้ Noto Sans Thai เพราะรองรับสระซ้อนและวรรณยุกต์ครบ
 * ฟอนต์ระบบของ Android วางวรรณยุกต์เพี้ยนเมื่อมีสระบนซ้อนกัน
 */
export const fontFamily = {
  regular: 'NotoSansThai_400Regular',
  medium: 'NotoSansThai_500Medium',
  semibold: 'NotoSansThai_600SemiBold',
  bold: 'NotoSansThai_700Bold',
} as const;

/**
 * ขนาดตัวอักษร
 *
 * lineHeight ของไทยต้องสูงกว่าอังกฤษราว 1.6 เท่าของ fontSize
 * ไม่งั้นวรรณยุกต์บนกับสระล่างของบรรทัดติดกันจะชนกัน
 */
export const typography = {
  display: { fontSize: 40, lineHeight: 52 },
  title: { fontSize: 24, lineHeight: 38 },
  heading: { fontSize: 18, lineHeight: 30 },
  body: { fontSize: 15, lineHeight: 26 },
  small: { fontSize: 13, lineHeight: 22 },
  caption: { fontSize: 11, lineHeight: 18 },
} as const;

export type TypographyVariant = keyof typeof typography;
