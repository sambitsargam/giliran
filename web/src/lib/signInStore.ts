import { useSyncExternalStore } from "react";

let open = false;
const listeners = new Set<() => void>();

export const signIn = {
  open() {
    open = true;
    listeners.forEach((l) => l());
  },
  close() {
    open = false;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useSignInOpen() {
  return useSyncExternalStore(signIn.subscribe, () => open, () => false);
}
