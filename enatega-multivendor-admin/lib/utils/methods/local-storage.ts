/**
 * Panel session storage helpers.
 * Uses sessionStorage so closing the tab/window clears restaurant selection,
 * route stack and other panel UI state (no sticky cross-session leftovers).
 */

const getStore = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const saveToLocalStorage = (key: string, data: string) => {
  try {
    const store = getStore();
    if (!store) return '';
    store.setItem(key, data);
    return key;
  } catch {
    return '';
  }
};

const getFromLocalStorage = (key: string) => {
  try {
    return getStore()?.getItem(key) ?? '';
  } catch {
    return '';
  }
};

const deleteFromLocalStorage = (key: string) => {
  try {
    getStore()?.removeItem(key);
    return key;
  } catch {
    return '';
  }
};

export const onUseLocalStorage = (
  type: 'save' | 'get' | 'delete',
  key: string,
  data: string = ''
): string | null => {
  switch (type) {
    case 'get':
      return getFromLocalStorage(key);
    case 'save':
      return saveToLocalStorage(key, data);
    case 'delete':
      return deleteFromLocalStorage(key);
    default:
      return '';
  }
};
