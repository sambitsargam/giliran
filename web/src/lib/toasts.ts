import { useSyncExternalStore } from "react";

export type ToastStatus = "wallet" | "pending" | "success" | "error" | "info";
export type Toast = {
  id: number;
  title: string;
  status: ToastStatus;
  detail?: string;
  hash?: string;
  /** Explanatory reverts (e.g. NoOneCanWithdraw) are expected; render them calmly. */
  expected?: boolean;
};

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const toastStore = {
  push(t: Omit<Toast, "id">): number {
    const id = nextId++;
    toasts = [...toasts, { ...t, id }].slice(-4);
    emit();
    return id;
  },
  update(id: number, patch: Partial<Omit<Toast, "id">>) {
    toasts = toasts.map((t) => (t.id === id ? { ...t, ...patch } : t));
    emit();
    const t = toasts.find((x) => x.id === id);
    if (t && (t.status === "success" || t.status === "info")) {
      setTimeout(() => toastStore.dismiss(id), 9000);
    }
  },
  dismiss(id: number) {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => toasts,
};

const empty: Toast[] = [];
export function useToasts(): Toast[] {
  return useSyncExternalStore(toastStore.subscribe, toastStore.get, () => empty);
}
