import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { removeOldestQuery, type PersistedClient } from '@tanstack/react-query-persist-client';
import { shouldPersistQuery, trimSettingsForDevice } from '@shared/offline-cache';
import { queryClient, OFFLINE_CACHE_MAX_AGE_MS } from './queryClient';

/**
 * A copy of the tradie's quotes, customers, jobs, invoices and (trimmed) settings,
 * kept on the phone so they open with no signal. What is kept, and how settings
 * are trimmed, is decided in shared/offline-cache.ts (tested there).
 *
 * The whole copy is one AsyncStorage entry. Android caps AsyncStorage 2.2.0 at
 * 6 MB in total by default (AsyncStorage_db_size_in_MB), and a single entry has to
 * fit in a ~2 MB SQLite read window. Current data is a small fraction of that; if
 * a write ever fails for size, removeOldestQuery drops the oldest query and retries.
 */

const STORAGE_KEY = '@vargen_query_cache';
/** Bump when a cached response's shape changes in a way old copies would break. */
const CACHE_SCHEMA = 1;

/**
 * AsyncStorage, except that an empty copy is deleted instead of written: after
 * sign-out the persister would otherwise write back an empty shell on the next
 * cache change, and "nothing left on the phone" should mean no entry at all.
 */
const storage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
  setItem: (key: string, value: string) => {
    let empty = false;
    if (value.length < 1_000) {
      try { empty = !(JSON.parse(value)?.clientState?.queries?.length > 0); } catch { /* write it */ }
    }
    return empty ? AsyncStorage.removeItem(key) : AsyncStorage.setItem(key, value);
  },
};

const persister = createAsyncStoragePersister({
  storage,
  key: STORAGE_KEY,
  throttleTime: 2_000,
  retry: removeOldestQuery,
  serialize: (client: PersistedClient) => JSON.stringify({
    ...client,
    clientState: {
      ...client.clientState,
      queries: client.clientState.queries.map((q) =>
        q.queryKey[0] === '/api/settings'
          ? { ...q, state: { ...q.state, data: trimSettingsForDevice(q.state.data) } }
          : q),
    },
  }),
});

export const persistOptions = {
  persister,
  maxAge: OFFLINE_CACHE_MAX_AGE_MS,
  // A new app version starts from a fresh copy rather than reading an old shape.
  buster: `${Constants.expoConfig?.version ?? '0'}:${CACHE_SCHEMA}`,
  dehydrateOptions: {
    shouldDehydrateQuery: (q: { queryKey: readonly unknown[]; state: { status: string } }) =>
      q.state.status === 'success' && shouldPersistQuery(q.queryKey),
  },
};

/**
 * Forget everything kept on the phone: on logout and when a session expires, so
 * the next person to sign in never sees the last one's data.
 */
export async function clearPersistedCache(): Promise<void> {
  // Memory first: a throttled write still pending can then only write an empty copy.
  queryClient.clear();
  await persister.removeClient();
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}
