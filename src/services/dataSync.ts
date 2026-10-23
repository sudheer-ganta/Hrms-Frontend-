import { useSyncExternalStore } from 'react';
import { TOKEN_STORAGE_KEY, clearApiCache } from './api';

/**
 * App-wide "data changed" signal.
 * - Every local write bumps `mutation` and broadcasts across open tabs.
 * - Server-Sent Events (SSE) pushes cross-user & background scheduler changes in real time.
 * - Cross-tab communication via BroadcastChannel synchronizes multiple tabs with 0 latency.
 * - Returning to the tab / window focus asks the server whether anything changed, and refreshes only if it did
 *   (it must not re-fetch every screen on each tab switch).
 */

let mutation = 0;
let lastFocusCheck = Date.now();
let lastUpdatedTime = new Date();
let currentKnownRevision = 0;

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let fallbackPollTimer: ReturnType<typeof setInterval> | undefined;
let eventSource: EventSource | null = null;
let reconnectAttempts = 0;

const listeners = new Set<() => void>();
const emit = () => {
  lastUpdatedTime = new Date();
  listeners.forEach((l) => l());
};

// Cross-tab broadcast channel
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('colormyles_hrms_sync');
    broadcastChannel.onmessage = (event) => {
      if (event.data?.type === 'DATA_CHANGED') {
        clearApiCache();
        mutation++;
        emit();
      }
    };
  } catch {
    broadcastChannel = null;
  }
}

// Coalesce bursts of writes into a single refresh.
export const notifyDataChanged = (broadcast = true) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    clearApiCache();
    mutation++;
    emit();
    if (broadcast && broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type: 'DATA_CHANGED', timestamp: Date.now() });
      } catch {
        // ignore channel errors
      }
    }
  }, 250);
};

// Check version against backend API
const checkServerRevision = async () => {
  try {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (!token) return;

    const res = await fetch('/api/realtime/version', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const json = await res.json();
    const serverRev = json?.data?.revision;
    if (typeof serverRev !== 'number') return;
    // First sighting (the stream's 'init' has not arrived yet): remember it, nothing has changed from our point of view.
    if (currentKnownRevision === 0) {
      currentKnownRevision = serverRev;
    } else if (serverRev > currentKnownRevision) {
      currentKnownRevision = serverRev;
      notifyDataChanged(false);
    } else {
      // Verified current: refresh the "Updated at" label only (the data version, and so every screen, is untouched).
      emit();
    }
  } catch {
    // network blip, ignore
  }
};

// Connect to Server-Sent Events (SSE) for instant cross-user / cross-device updates
export const initRealtimeSync = () => {
  if (typeof window === 'undefined') return;
  if (eventSource && eventSource.readyState !== EventSource.CLOSED) return;

  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) return;

  try {
    const url = `/api/realtime/stream?token=${encodeURIComponent(token)}`;
    eventSource = new EventSource(url);

    eventSource.addEventListener('init', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data?.revision) {
          currentKnownRevision = Math.max(currentKnownRevision, data.revision);
        }
      } catch {
        // ignore parse error
      }
    });

    eventSource.addEventListener('change', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data?.revision && data.revision > currentKnownRevision) {
          currentKnownRevision = data.revision;
          notifyDataChanged(false);
        }
      } catch {
        // ignore parse error
      }
    });

    eventSource.onopen = () => {
      reconnectAttempts = 0;
      // Stop fallback polling when SSE is active
      if (fallbackPollTimer) {
        clearInterval(fallbackPollTimer);
        fallbackPollTimer = undefined;
      }
    };

    eventSource.onerror = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      // Start fallback poll while disconnected
      if (!fallbackPollTimer) {
        fallbackPollTimer = setInterval(checkServerRevision, 25000);
      }

      // Exponential backoff reconnect
      reconnectAttempts++;
      const delay = Math.min(30000, 2000 * Math.pow(1.5, reconnectAttempts));
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        initRealtimeSync();
      }, delay);
    };
  } catch {
    // SSE not supported or network error; fallback poll
    if (!fallbackPollTimer) {
      fallbackPollTimer = setInterval(checkServerRevision, 25000);
    }
  }
};

export const disconnectRealtimeSync = () => {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }
  if (fallbackPollTimer) {
    clearInterval(fallbackPollTimer);
    fallbackPollTimer = undefined;
  }
};

// Tab visibility & Window focus refresh
if (typeof window !== 'undefined') {
  const onFocusOrVisible = () => {
    const now = Date.now();
    // Throttle to once every 5 seconds. Only a real server-side change refreshes the screens.
    if (now - lastFocusCheck > 5000) {
      lastFocusCheck = now;
      void checkServerRevision();
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') onFocusOrVisible();
  });
  window.addEventListener('focus', onFocusOrVisible);
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

/** Changes after any write anywhere, cross-user SSE event, cross-tab broadcast, or a server change seen on returning to the tab. */
export const useDataVersion = (): number =>
  useSyncExternalStore(subscribe, () => mutation);

/** Changes only after a write — for screens with unsaved drafts. */
export const useMutationVersion = (): number => useSyncExternalStore(subscribe, () => mutation);

/** Returns timestamp of when data was last refreshed. */
export const getLastUpdatedTime = (): Date => lastUpdatedTime;

/** Subscribes to the last updated timestamp so components can render honest last-refreshed badges. */
export const useLastUpdatedTime = (): Date =>
  useSyncExternalStore(subscribe, () => lastUpdatedTime);
