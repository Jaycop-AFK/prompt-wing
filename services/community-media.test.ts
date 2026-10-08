import { beforeEach, describe, expect, it, vi } from 'vitest';

import { persistCommunityImage } from '../storage/community-media';

const mocks = vi.hoisted(() => ({ copy: vi.fn(), platform: { OS: 'android' } }));
vi.mock('react-native', () => ({ Platform: mocks.platform }));
vi.mock('expo-file-system', () => ({
  Paths: { document: 'file:///documents' },
  Directory: class { exists = true; },
  File: class {
    extension = '.jpg';
    uri = 'file:///documents/community-posts/saved.jpg';
    copy = mocks.copy;
  },
}));

describe('community image persistence', () => {
  beforeEach(() => {
    mocks.copy.mockReset();
    mocks.platform.OS = 'android';
  });

  it('does not publish a saved URI before the asynchronous copy finishes', async () => {
    let finishCopy!: () => void;
    mocks.copy.mockReturnValue(new Promise<void>((resolve) => { finishCopy = resolve; }));
    let returned = false;
    const result = persistCommunityImage('file:///cache/photo.jpg').then((uri) => {
      returned = true;
      return uri;
    });
    await vi.waitFor(() => expect(mocks.copy).toHaveBeenCalledOnce());
    expect(returned).toBe(false);
    finishCopy();
    await expect(result).resolves.toBe('file:///documents/community-posts/saved.jpg');
  });

  it('propagates a copy failure instead of saving a broken URI', async () => {
    mocks.copy.mockRejectedValue(new Error('disk full'));
    await expect(persistCommunityImage('file:///cache/photo.jpg')).rejects.toThrow('disk full');
  });

  it('keeps browser image URIs without invoking native storage', async () => {
    mocks.platform.OS = 'web';
    await expect(persistCommunityImage('blob:photo')).resolves.toBe('blob:photo');
    expect(mocks.copy).not.toHaveBeenCalled();
  });
});
