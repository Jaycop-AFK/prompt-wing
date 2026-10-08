import { describe, expect, it } from 'vitest';

import {
  futureDateAt,
  mockRaceEvents,
  validateRaceEventInput,
  validateRunBuddyInput,
  type CreateRaceEventInput,
  type CreateRunBuddyInput,
} from './community';

const NOW = new Date('2026-09-03T00:00:00+07:00').getTime();

describe('community event model', () => {
  it('creates realistic mock events in the future', () => {
    const events = mockRaceEvents(NOW);
    expect(events).toHaveLength(3);
    expect(events.every((event) => event.dateAt > NOW)).toBe(true);
    expect(events.every((event) => event.venue && event.participantCount)).toBe(true);
  });

  it('sets a future date at the requested local clock time', () => {
    const result = new Date(futureDateAt(NOW, 2, 6, 15));
    expect(result.getHours()).toBe(6);
    expect(result.getMinutes()).toBe(15);
  });

  it('validates event date, place and distance', () => {
    const valid: CreateRaceEventInput = {
      name: 'Sunday Easy Run',
      date: '2026-09-10',
      time: '06:00',
      venue: 'สวนลุมพินี ประตู 3',
      province: 'กรุงเทพมหานคร',
      distanceKm: 5,
      description: 'วิ่งสบาย ๆ ด้วยกัน',
    };
    expect(validateRaceEventInput(valid, NOW)).toBeNull();
    expect(validateRaceEventInput({ ...valid, distanceKm: 0 }, NOW)).toContain('ระยะทาง');
    expect(validateRaceEventInput({ ...valid, date: '2026-01-01' }, NOW)).toContain('อนาคต');
  });
});

describe('run buddy post model', () => {
  it('accepts a complete post with an optional image', () => {
    const valid: CreateRunBuddyInput = {
      displayName: 'มิ้นท์',
      meetingPlace: 'สวนรถไฟ หน้าอาคารกีฬา',
      runTime: 'วันอาทิตย์ 07:00',
      paceSecPerKm: 420,
      message: 'ชวนวิ่งสลับเดิน 4K',
      capacity: 5,
      imageUri: 'file:///community/photo.jpg',
    };
    expect(validateRunBuddyInput(valid)).toBeNull();
  });

  it('rejects posts without a useful meeting point or valid capacity', () => {
    const base: CreateRunBuddyInput = {
      displayName: 'ต้น',
      meetingPlace: 'สวนเบญจกิติ',
      runTime: 'วันศุกร์ 19:00',
      paceSecPerKm: 360,
      message: 'tempo เบา ๆ 6K',
      capacity: 6,
    };
    expect(validateRunBuddyInput({ ...base, meetingPlace: '' })).toContain('สถานที่');
    expect(validateRunBuddyInput({ ...base, capacity: 30 })).toContain('2–20');
  });
});
