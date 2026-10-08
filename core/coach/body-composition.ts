import type { Sex } from './types';

export interface NavyBodyFatInput {
  sex: Sex | null;
  heightCm: number | null;
  waistCm: number | null;
  neckCm: number | null;
  hipCm: number | null;
}

/** ประมาณเปอร์เซ็นต์ไขมันด้วย US Navy circumference method; สูตรต้นฉบับใช้หน่วยนิ้ว */
export function calculateNavyBodyFat(input: NavyBodyFatInput): number | null {
  const { sex, heightCm, waistCm, neckCm, hipCm } = input;
  if (!sex || !heightCm || !waistCm || !neckCm || heightCm <= 0 || waistCm <= neckCm) return null;

  const heightIn = heightCm / 2.54;
  const neckIn = neckCm / 2.54;
  let result: number;

  if (sex === 'male') {
    result = 86.01 * Math.log10(waistCm / 2.54 - neckIn) - 70.041 * Math.log10(heightIn) + 36.76;
  } else {
    if (!hipCm || waistCm + hipCm <= neckCm) return null;
    result =
      163.205 * Math.log10((waistCm + hipCm - neckCm) / 2.54) -
      97.684 * Math.log10(heightIn) -
      78.387;
  }

  return Number.isFinite(result) && result > 0 && result <= 70 ? result : null;
}
