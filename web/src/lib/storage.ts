// Display names, avatars and organiser secrets live only on this device, never on-chain.

export function readJSON<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or full storage: the app still works, it just forgets labels.
  }
}

export type MemberLabel = { name: string; emoji?: string };

const LABELS = "giliran.labels";

export function getLabels(): Record<string, MemberLabel> {
  return readJSON<Record<string, MemberLabel>>(LABELS, {});
}

export function setLabel(address: string, label: MemberLabel): void {
  const all = getLabels();
  all[address.toLowerCase()] = label;
  writeJSON(LABELS, all);
}

export function setLabels(labels: Record<string, MemberLabel>): void {
  const all = getLabels();
  for (const [k, v] of Object.entries(labels)) all[k.toLowerCase()] = v;
  writeJSON(LABELS, all);
}

export type SavedSecret = { circle?: string; secret: string; organiser: string; createdAt: number; name?: string };

export function saveSecret(s: SavedSecret): void {
  const all = readJSON<SavedSecret[]>("giliran.secrets", []);
  all.push(s);
  writeJSON("giliran.secrets", all);
}

export function findSecret(circle: string): SavedSecret | undefined {
  return readJSON<SavedSecret[]>("giliran.secrets", []).find(
    (s) => s.circle?.toLowerCase() === circle.toLowerCase(),
  );
}

export function attachSecretToCircle(secret: string, circle: string): void {
  const all = readJSON<SavedSecret[]>("giliran.secrets", []);
  for (const s of all) if (s.secret === secret) s.circle = circle;
  writeJSON("giliran.secrets", all);
}
