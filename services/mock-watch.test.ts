import { describe, expect, it } from 'vitest';

import { findMockWatchDevice, simulateWatchMetrics } from '@/services/mock-watch';

describe('simulateWatchMetrics', () => {
  it('keeps resting metrics in a plausible demo range', () => {
    const value = simulateWatchMetrics('rest', 30);
    expect(value.heartRateBpm).toBeGreaterThanOrEqual(64);
    expect(value.heartRateBpm).toBeLessThanOrEqual(80);
    expect(value.cadenceSpm).toBe(0);
    expect(value.spo2Percent).toBeGreaterThanOrEqual(95);
  });

  it('makes running heart rate and cadence higher than walking', () => {
    const walking = simulateWatchMetrics('walk', 20);
    const running = simulateWatchMetrics('run', 20);
    expect(running.heartRateBpm).toBeGreaterThan(walking.heartRateBpm);
    expect(running.cadenceSpm).toBeGreaterThan(walking.cadenceSpm);
  });

  it('is deterministic for the same mode and tick', () => {
    expect(simulateWatchMetrics('run', 42)).toEqual(simulateWatchMetrics('run', 42));
  });
});

describe('findMockWatchDevice', () => {
  it('returns null for stale persisted ids', () => {
    expect(findMockWatchDevice('missing')).toBeNull();
  });
});
