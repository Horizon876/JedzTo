import {
  APP_NAME,
  SELECTED_RESTAURANT,
  SELECTED_SHOPTYPE,
  SELECTED_VENDOR,
  SELECTED_VENDOR_EMAIL,
} from '@/lib/utils/constants';
import { ILoginResponse } from '@/lib/utils/interfaces';

const AUTH_KEYS = {
  TOKEN: 'token',
  USER_TYPE: 'userType',
  USER_ID: 'userId',
  TOKEN_EXPIRATION: 'tokenExpiration',
} as const;

/** Session keys that must never survive closing the browser tab. */
const SESSION_SCOPED_KEYS = [
  ...Object.values(AUTH_KEYS),
  `user-${APP_NAME}`,
  SELECTED_VENDOR,
  SELECTED_VENDOR_EMAIL,
  SELECTED_RESTAURANT,
  SELECTED_SHOPTYPE,
  'messaging-token',
  'routeStack',
] as const;

export const SESSION_USER_KEY = `user-${APP_NAME}`;

/** Panel roles allowed into the web admin UI at all. */
export const PANEL_WEB_ROLES = new Set(['ADMIN', 'STAFF', 'RESTAURANT', 'VENDOR']);

/** Roles that may open super-admin routes. */
export const SUPER_ADMIN_ROLES = new Set(['ADMIN', 'STAFF']);

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

/** Wipe leftover persistent auth from older builds (localStorage). */
export function clearLegacyLocalAuth(): void {
  if (typeof window === 'undefined') return;
  try {
    for (const key of SESSION_SCOPED_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

export function setAuthTokens(payload: {
  token?: string;
  userType?: string;
  userId?: string;
  tokenExpiration?: string | number;
}): void {
  const store = storage();
  if (!store) return;
  if (payload.token) store.setItem(AUTH_KEYS.TOKEN, payload.token);
  if (payload.userType) store.setItem(AUTH_KEYS.USER_TYPE, payload.userType);
  if (payload.userId) store.setItem(AUTH_KEYS.USER_ID, payload.userId);
  if (payload.tokenExpiration)
    store.setItem(AUTH_KEYS.TOKEN_EXPIRATION, String(payload.tokenExpiration));
}

export function getAccessToken(): string {
  const store = storage();
  if (!store) return '';
  return store.getItem(AUTH_KEYS.TOKEN) ?? '';
}

export function getUserType(): string {
  const store = storage();
  if (!store) return '';
  return store.getItem(AUTH_KEYS.USER_TYPE) ?? '';
}

export function clearAuthTokens(): void {
  const store = storage();
  if (!store) return;
  Object.values(AUTH_KEYS).forEach((key) => store.removeItem(key));
}

export function getStoredUser(): ILoginResponse | null {
  const store = storage();
  if (!store) return null;

  const storedUser = store.getItem(SESSION_USER_KEY);
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as ILoginResponse;
  } catch {
    store.removeItem(SESSION_USER_KEY);
    return null;
  }
}

export function setStoredUser(user: ILoginResponse): void {
  const store = storage();
  if (!store) return;
  store.setItem(SESSION_USER_KEY, JSON.stringify(user));
}

export function persistUserSession(user: ILoginResponse): void {
  const store = storage();
  if (!store) return;

  clearLegacyLocalAuth();
  setStoredUser(user);
  setAuthTokens({
    userId: user.userId,
    token: user.token,
    tokenExpiration: user.tokenExpiration,
    userType: user.userType,
  });

  if (user.userType === 'VENDOR') {
    store.setItem(SELECTED_VENDOR, user.userId);
    store.setItem(SELECTED_VENDOR_EMAIL, user.email);
  }

  if (user.userType === 'RESTAURANT' && user.userTypeId) {
    store.setItem(SELECTED_RESTAURANT, user.userTypeId);
    store.setItem(SELECTED_SHOPTYPE, user.shopType ?? '');
  }
}

export function clearStoredSessionState(): void {
  if (typeof window === 'undefined') return;

  clearAuthTokens();
  clearLegacyLocalAuth();

  const store = storage();
  if (!store) return;

  for (const key of SESSION_SCOPED_KEYS) {
    store.removeItem(key);
  }
}

export function isSuperAdminPanelRole(userType?: string | null): boolean {
  return SUPER_ADMIN_ROLES.has(String(userType || ''));
}

export function isRestaurantPanelRole(userType?: string | null): boolean {
  const type = String(userType || '');
  return type === 'RESTAURANT' || type === 'VENDOR' || isSuperAdminPanelRole(type);
}

export function isAllowedWebPanelRole(userType?: string | null): boolean {
  return PANEL_WEB_ROLES.has(String(userType || ''));
}
