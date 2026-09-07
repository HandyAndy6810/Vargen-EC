import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * One vocabulary for touch feedback, so the app is consistent about what each
 * sensation means. Apple's rule is that haptics carry information — a buzz that
 * fires on everything teaches the hand to ignore it.
 *
 * Android's implementations of these are coarse and inconsistent between makers, and
 * the Taptic Engine is what the grammar was written for, so this is iOS-only.
 */
const on = Platform.OS === 'ios';

/** Moving between options: a tab, a filter pill, a chip. The lightest tick there is. */
export const hapticSelect = () => { if (on) Haptics.selectionAsync(); };

/** A value crossed a meaningful mark — used as the markup slider passes each 5%. */
export const hapticTick = () => {
  if (on) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/** A deliberate, consequential press: adding a line, locking a price. */
export const hapticPress = () => {
  if (on) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

/** It worked — the quote saved, the quote sent. */
export const hapticSuccess = () => {
  if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

/** It didn't. Paired with a message on screen, never on its own. */
export const hapticError = () => {
  if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};

/** Destructive and irreversible: deleting a line, discarding a quote. */
export const hapticWarn = () => {
  if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
};
