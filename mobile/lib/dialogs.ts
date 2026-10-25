import { Alert, Platform } from 'react-native';

/**
 * Web-safe replacements for Alert.alert. react-native-web's Alert is a no-op,
 * so every confirm/notice must branch — these helpers centralise that branch.
 */

export function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert([title, message].filter(Boolean).join('\n'));
  } else {
    Alert.alert(title, message);
  }
}

export function showConfirm(opts: {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** Label for the button that backs out (native only). Defaults to Cancel. */
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}) {
  const { title, message, confirmLabel = 'OK', cancelLabel = 'Cancel', destructive = false, onConfirm, onCancel } = opts;
  if (Platform.OS === 'web') {
    const ok = window.confirm([title, message].filter(Boolean).join('\n'));
    if (ok) onConfirm();
    else onCancel?.();
  } else {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: onCancel },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
    ]);
  }
}
