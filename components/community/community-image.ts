import type { ImageSource } from 'expo-image';

import type { CommunityImageId } from '@/services/community';

const COMMUNITY_IMAGES: Record<CommunityImageId, ImageSource> = {
  morning: require('@/assets/community/morning-run.jpg'),
  night: require('@/assets/community/night-run.jpg'),
  lakeside: require('@/assets/community/lakeside-run.jpg'),
};

export function communityImageSource(id: CommunityImageId = 'morning'): ImageSource {
  return COMMUNITY_IMAGES[id];
}

export function buddyImageSource(uri?: string | null): ImageSource | null {
  if (!uri) return null;
  if (uri === 'asset:morning') return COMMUNITY_IMAGES.morning;
  if (uri === 'asset:night') return COMMUNITY_IMAGES.night;
  if (uri === 'asset:lakeside') return COMMUNITY_IMAGES.lakeside;
  return { uri };
}
