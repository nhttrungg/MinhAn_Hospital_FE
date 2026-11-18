export type LocalClinicalDraft<T = unknown> = {
  key: string;
  accountId: number;
  encounterId: number;
  kind: "CHART" | "RX";
  value: T;
  revision: number;
  updatedAt: number;
  expiresAt: number;
};
let loggingOut = false;
let logoutChannel: BroadcastChannel | null = null;
function receiveLogout(remote = false) {
  loggingOut = true;
  window.dispatchEvent(new Event("antam-drafts-logout"));
  if (remote) window.dispatchEvent(new Event("antam-remote-logout"));
}
function connectLogoutChannel() {
  if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined" && !logoutChannel) {
    logoutChannel = new BroadcastChannel("antam-clinical-session");
    logoutChannel.onmessage = (event) => {
      if (event.data === "logout") receiveLogout(true);
    };
  }
}
export function draftsAllowed() {
  connectLogoutChannel();
  return !loggingOut;
}
export function draftKey(accountId: number, encounterId: number, kind: string) {
  return `${accountId}:${encounterId}:${kind}`;
}
async function database() {
  connectLogoutChannel();
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("antam-clinical-drafts", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("drafts", { keyPath: "key" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function operation<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("drafts", mode);
    const r = run(tx.objectStore("drafts"));
    let value: T;
    r.onsuccess = () => {
      value = r.result;
    };
    tx.oncomplete = () => {
      db.close();
      resolve(value);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}
export async function readDraft<T>(key: string): Promise<LocalClinicalDraft<T> | undefined> {
  // Separate writers keep another tab's unsynchronized content intact.
  const records = await operation<LocalClinicalDraft<T>[]>("readonly", (s) => s.getAll());
  const matches = records.filter((r) => r.key === key || r.key.startsWith(`${key}:`));
  for (const r of matches.filter((r) => r.expiresAt <= Date.now())) await deleteDraft(r.key);
  return matches
    .filter((r) => r.expiresAt > Date.now())
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
}
export async function writeDraft<T>(draft: LocalClinicalDraft<T>) {
  if (loggingOut) return;
  await operation("readwrite", (s) => s.put(draft));
}
export async function deleteDraft(key: string) {
  await operation("readwrite", (s) => s.delete(key));
}
export async function clearClinicalDrafts() {
  receiveLogout();
  connectLogoutChannel();
  logoutChannel?.postMessage("logout");
  await operation("readwrite", (s) => s.clear());
}
export class DraftQueue {
  private tail: Promise<unknown> = Promise.resolve();
  run<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.tail.then(operation, operation);
    this.tail = next.catch(() => undefined);
    return next;
  }
}
