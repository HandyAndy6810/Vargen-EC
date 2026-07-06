import { Clipboard, Platform } from 'react-native';

/**
 * Single clipboard entry point. RN core's Clipboard is deprecated — when
 * expo-clipboard is added (run `npx expo install expo-clipboard`), swap the
 * implementation here and nothing else needs touching.
 */
export function copyText(value: string) {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(value).catch(() => {});
  } else {
    Clipboard.setString(value);
  }
}
