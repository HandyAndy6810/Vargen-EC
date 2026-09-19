import { useRef } from 'react';
import { useLocalSearchParams, useGlobalSearchParams } from 'expo-router';

/**
 * Entry parameters for the quote and invoice flows, read safely.
 *
 * Two hooks are needed because these are read in a route GROUP's layout, and
 * useLocalSearchParams is scoped to the layout's own segment — the query string on
 * /invoices/create?invoiceId=3 lands on the child route, not the layout, so locally
 * it comes back empty.
 *
 * And the value is LATCHED rather than captured. The previous version read both in
 * a useRef initialiser, which runs once on the first render — and if the router has
 * not resolved the query string by that frame, the id is 0 and stays 0 for the life
 * of the flow. That is a race, so it failed intermittently: "Edit invoice" opening a
 * blank builder some of the time and working other times. Latching takes the value
 * the moment it appears and then holds it, so a later navigation inside the flow
 * cannot change it either.
 */
function useLatched<T>(read: () => T, isEmpty: (v: T) => boolean): T | undefined {
  const latched = useRef<T | undefined>(undefined);
  const seen = read();
  if (latched.current === undefined && !isEmpty(seen)) latched.current = seen;
  return latched.current;
}

/** A numeric entry id — 0 until it appears, then fixed. */
export function useEntryId(name: string): number {
  const local = useLocalSearchParams<Record<string, string>>();
  const global = useGlobalSearchParams<Record<string, string>>();
  const value = useLatched(
    () => Number(local[name] ?? global[name] ?? 0) || 0,
    v => v === 0,
  );
  return value ?? 0;
}

/** A text entry param, e.g. a customer name to prefill. */
export function useEntryText(name: string): string | undefined {
  const local = useLocalSearchParams<Record<string, string>>();
  const global = useGlobalSearchParams<Record<string, string>>();
  return useLatched(
    () => (local[name] ?? global[name]) as string | undefined,
    v => v === undefined || v === '',
  );
}
