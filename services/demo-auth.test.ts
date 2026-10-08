import { describe, expect, it } from 'vitest';

import { matchesDemoCredentials } from '@/services/demo-auth';

const config = { email: 'demo@promptwing.app', password: 'PromptWing57!' };

describe('matchesDemoCredentials', () => {
  it('accepts the configured email case-insensitively', () => {
    expect(matchesDemoCredentials(config, ' Demo@PromptWing.App ', 'PromptWing57!')).toBe(true);
  });

  it('rejects a wrong password', () => {
    expect(matchesDemoCredentials(config, config.email, 'wrong-password')).toBe(false);
  });
});
