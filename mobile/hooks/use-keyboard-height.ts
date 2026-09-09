import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * How much of the screen the keyboard is currently covering.
 *
 * For a bar pinned with `position: absolute; bottom: 0`, KeyboardAvoidingView does
 * nothing — the bar is out of the layout flow, so it stays put and the keyboard
 * covers it. Offsetting `bottom` by this value lifts it clear instead.
 *
 * iOS gets the `Will` events so the bar moves with the keyboard rather than
 * snapping after it; Android only fires `Did`.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, e => setHeight(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  return height;
}
