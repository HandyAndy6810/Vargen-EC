import { Platform } from 'react-native';

/**
 * Share to Vargen (docs/pricing-design.md, step 5): the share extension (iOS) or
 * share intent (Android) opens the app with a vargen:// link carrying the share
 * key. Send that straight to the share screen; leave every other link alone.
 * expo-share-intent only works in a build with its native code (1.2.0+); the
 * key is the app's scheme + "ShareKey" (its getShareExtensionKey), written out
 * here so this file never loads the native module just to route a link.
 */
const SHARE_KEY = 'vargenShareKey';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (Platform.OS !== 'web' && path.includes(`dataUrl=${SHARE_KEY}`)) return '/share';
    return path;
  } catch {
    return '/';
  }
}
