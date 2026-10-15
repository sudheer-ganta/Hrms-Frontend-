import { useSyncExternalStore } from 'react';

/**
 * App-wide "data changed" signal. Every successful write (approve a request,
 * save settings, sync, punch...) bumps `mutation`, and returning to the tab
 * after a while bumps `focus` (background syncs may have changed things).
 * Pages add the version to their fetch effect's dependencies so they all stay
 * in step without each one knowing about the others.
 */
let mutation = 0;
let focus = 0;
let lastFocusBump = Date.now();
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

// Coalesce bursts of writes into a single refresh.
export const notifyDataChanged = () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    mutation++;
    emit();
  }, 250);
};

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastFocusBump > 60_000) {
      lastFocusBump = Date.now();
      focus++;
      emit();
    }
  });
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

/** Changes after any write anywhere, and after returning to a stale tab. */
export const useDataVersion = (): number =>
  useSyncExternalStore(subscribe, () => mutation + focus);

/** Changes only after a write — for screens with unsaved drafts. */
export const useMutationVersion = (): number => useSyncExternalStore(subscribe, () => mutation);
