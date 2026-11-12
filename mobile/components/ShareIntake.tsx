import { Platform } from 'react-native';
import type { ReactNode } from 'react';
import { ShareIntentProvider } from 'expo-share-intent';

/**
 * Share to Vargen (docs/pricing-design.md, step 5): holds what was shared into
 * the app until the share screen (app/share.tsx) has handled it. The library's
 * docs ask for it outermost, above every other provider.
 *
 * Not reset on background: a tradie may leave to check something, or sign in
 * first, and the share must still be there when they come back. The share
 * screen clears it once the tradie has chosen what to do. Off on the web
 * (no share sheet there).
 */
export function ShareIntake({ children }: { children: ReactNode }) {
  return (
    <ShareIntentProvider options={{ resetOnBackground: false, disabled: Platform.OS === 'web' }}>
      {children}
    </ShareIntentProvider>
  );
}
