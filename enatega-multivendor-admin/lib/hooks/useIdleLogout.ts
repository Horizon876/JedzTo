'use client';

import { useEffect, useRef } from 'react';

/** Auto-logout after this many ms of no mouse/keyboard/touch activity. */
export const PANEL_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'click',
];

/**
 * Logs the user out after idle timeout.
 * Session itself lives in sessionStorage (cleared when the browser tab closes).
 */
export function useIdleLogout(
  enabled: boolean,
  onIdle: () => void,
  timeoutMs: number = PANEL_IDLE_TIMEOUT_MS
): void {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const arm = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        onIdleRef.current();
      }, timeoutMs);
    };

    const onActivity = () => arm();

    arm();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    return () => {
      if (timer) clearTimeout(timer);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, [enabled, timeoutMs]);
}
