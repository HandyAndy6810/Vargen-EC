import * as Clipboard from 'expo-clipboard';

// Single clipboard entry point — expo-clipboard handles web + native.
export function copyText(value: string) {
  Clipboard.setStringAsync(value).catch(() => {});
}
