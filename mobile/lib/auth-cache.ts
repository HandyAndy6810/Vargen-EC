import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@shared/mobile-types';

export const AUTH_STORAGE_KEY = '@vargen_auth_user';

export async function loadCachedUser(): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export async function saveCachedUser(user: User): Promise<void> {
  try { await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user)); } catch {}
}

export async function clearCachedUser(): Promise<void> {
  try { await AsyncStorage.removeItem(AUTH_STORAGE_KEY); } catch {}
}
