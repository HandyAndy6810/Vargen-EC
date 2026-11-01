import { onlineManager } from '@tanstack/react-query';
import { isNetworkError, markOffline } from './connectivity';

/** What the AI buttons say with no connection. Manual quoting still works offline. */
export const AI_OFFLINE_MESSAGE = 'AI needs a connection. You can still build this quote manually.';

/**
 * Run an AI request (a raw fetch, so it doesn't pass through apiRequest's
 * connectivity tracking). Fails fast with AI_OFFLINE_MESSAGE when the app already
 * knows it's offline, and turns a connection failure into the same message. Our
 * own 60s AbortController timeout is left alone: that's a slow server, not no signal.
 */
export async function withAiConnection<T>(run: () => Promise<T>): Promise<T> {
  if (!onlineManager.isOnline()) throw new Error(AI_OFFLINE_MESSAGE);
  try {
    return await run();
  } catch (err: any) {
    if (err?.name !== 'AbortError' && isNetworkError(err)) {
      markOffline();
      throw new Error(AI_OFFLINE_MESSAGE);
    }
    throw err;
  }
}
