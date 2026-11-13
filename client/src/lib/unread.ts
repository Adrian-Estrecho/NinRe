import { useSyncExternalStore } from "react";
import { api } from "../api";

/* How many notifications are unread: the bell's badge, kept in step by the notifications screen. */

let unread = 0;
const listeners = new Set<() => void>();

export function setUnread(n: number) {
  if (n === unread) return;
  unread = n;
  listeners.forEach((l) => l());
}

/** Asks the server again. Quietly keeps the last count when offline. */
export async function refreshUnread() {
  try {
    setUnread((await api.unreadCount()).unread);
  } catch {
    // The badge can wait for the next check.
  }
}

export const useUnread = () =>
  useSyncExternalStore((l) => {
    listeners.add(l);
    return () => listeners.delete(l);
  }, () => unread);
