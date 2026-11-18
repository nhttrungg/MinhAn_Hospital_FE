"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  deleteDraft,
  draftKey,
  draftsAllowed,
  readDraft,
  writeDraft,
  type LocalClinicalDraft,
  DraftQueue,
} from "@/lib/clinical-drafts";
export type DraftStatus = "idle" | "saving" | "server" | "local" | "error" | "conflict";
export const draftStatusLabels: Record<DraftStatus, string> = {
  idle: "Chưa có thay đổi",
  saving: "Đang lưu",
  server: "Đã lưu trên máy chủ",
  local: "Chỉ lưu trên máy",
  error: "Lỗi lưu",
  conflict: "Xung đột",
};
type Options<T> = {
  accountId?: number;
  encounterId: number;
  kind: "CHART" | "RX";
  enabled: boolean;
  value: T | null;
  revision: number;
  queue: DraftQueue;
  valid: (value: T) => boolean;
  save: (
    value: T,
    revision: number,
    requestId: string,
  ) => Promise<{ revision: number; savedAt: string }>;
  onSaved: (value: T, editedDuringSave: boolean) => void;
  validateRestore: () => Promise<void>;
};
export function useClinicalAutosave<T>(options: Options<T>) {
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  }, [options]);
  const flushRef = useRef<() => Promise<boolean>>(async () => false);
  const [status, setStatus] = useState<DraftStatus>("idle");
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [recovery, setRecovery] = useState<LocalClinicalDraft<T> | null>(null);
  const [ready, setReady] = useState(false);
  const [writerId] = useState(() => crypto.randomUUID());
  const state = useRef({
    revision: options.revision,
    sequence: 0,
    savedSequence: 0,
    firstDirty: 0,
    local: 0 as ReturnType<typeof setTimeout> | 0,
    remote: 0 as ReturnType<typeof setTimeout> | 0,
    stopped: false,
    ready: false,
    recovering: false,
    conflicted: false,
    value: null as T | null,
    fingerprint: "",
    retry: null as { value: T; revision: number; requestId: string; sequence: number } | null,
    recoveredKey: null as string | null,
  });
  const key = options.accountId
    ? draftKey(options.accountId, options.encounterId, options.kind)
    : "";
  const localSave = useCallback(async () => {
    const o = latest.current,
      s = state.current;
    if (!o.accountId || s.value === null || s.stopped || !draftsAllowed()) return;
    await writeDraft({
      key: `${draftKey(o.accountId, o.encounterId, o.kind)}:${writerId}`,
      accountId: o.accountId,
      encounterId: o.encounterId,
      kind: o.kind,
      value: s.value,
      revision: s.revision,
      updatedAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    });
  }, [writerId]);
  const flush = useCallback(async (): Promise<boolean> => {
    const o = latest.current,
      s = state.current;
    if (s.stopped || !o.enabled || s.conflicted) return false;
    if (!s.ready || s.recovering) {
      setError("Hãy xử lý đề nghị khôi phục nháp trước khi đồng bộ hoặc hoàn tất.");
      return false;
    }
    clearTimeout(s.local);
    clearTimeout(s.remote);
    if (s.value === null || s.sequence === s.savedSequence) return true;
    let localPersisted = false;
    try {
      await localSave();
      localPersisted = true;
    } catch (e) {
      setStatus("error");
      setError(
        `Không lưu được trên máy: ${e instanceof Error ? e.message : "IndexedDB không khả dụng"}`,
      );
    }
    if (!o.valid(s.value)) {
      setStatus(localPersisted ? "local" : "error");
      setError(
        "Nội dung chưa đủ điều kiện lưu máy chủ. Hoàn thiện thông tin hoặc xử lý cảnh báo trước khi chốt.",
      );
      return false;
    }
    return o.queue.run(async () => {
      if (s.sequence === s.savedSequence) return true;
      if (s.stopped || s.conflicted || s.value === null) return false;
      // Reuse a request ID after an ambiguous network failure, before sending later edits.
      const request = s.retry ?? {
        value: structuredClone(s.value),
        revision: s.revision,
        requestId: crypto.randomUUID(),
        sequence: s.sequence,
      };
      s.retry = request;
      setStatus("saving");
      setError("");
      try {
        const result = await latest.current.save(
          request.value,
          request.revision,
          request.requestId,
        );
        s.revision = result.revision;
        s.savedSequence = request.sequence;
        s.retry = null;
        s.firstDirty = 0;
        const edited = s.sequence !== request.sequence;
        latest.current.onSaved(request.value, edited);
        setSavedAt(result.savedAt);
        if (!edited) {
          s.value = null;
          await deleteDraft(
            `${draftKey(latest.current.accountId!, latest.current.encounterId, latest.current.kind)}:${writerId}`,
          );
          if (s.recoveredKey) {
            await deleteDraft(s.recoveredKey);
            s.recoveredKey = null;
          }
          setStatus("server");
        } else {
          await localSave();
          setStatus("local");
          s.remote = setTimeout(() => void flushRef.current(), 3000);
        }
        return !edited;
      } catch (e) {
        const conflict =
          e instanceof ApiError &&
          e.status === 409 &&
          e.problem.code !== "SAFETY_OVERRIDE_REQUIRED";
        s.conflicted = conflict;
        if (e instanceof ApiError && e.status < 500) s.retry = null;
        setStatus(conflict ? "conflict" : navigator.onLine || !localPersisted ? "error" : "local");
        setError(e instanceof Error ? e.message : "Không đồng bộ được nháp");
        return false;
      }
    });
  }, [localSave, writerId]);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);
  useEffect(() => {
    let alive = true;
    if (!key || !options.enabled) return;
    void readDraft<T>(key)
      .then(async (r) => {
        if (r) {
          await latest.current.validateRestore();
          if (alive) {
            state.current.recovering = true;
            setRecovery(r);
          }
        }
        if (alive) {
          state.current.ready = true;
          setReady(true);
        }
      })
      .catch((e) => {
        if (alive) {
          state.current.ready = true;
          setReady(true);
          setError(e instanceof Error ? e.message : "Không đọc được nháp");
        }
      });
    return () => {
      alive = false;
    };
  }, [key, options.enabled]);
  useEffect(() => {
    const s = state.current;
    if (!ready || recovery || !options.enabled || s.stopped) return;
    if (options.value === null) {
      if (s.value === null) s.revision = options.revision;
      return;
    }
    const fingerprint = JSON.stringify(options.value);
    if (fingerprint === s.fingerprint) return;
    if (s.value === null) {
      s.revision = options.revision;
      s.firstDirty = Date.now();
    }
    s.value = options.value;
    s.fingerprint = fingerprint;
    s.sequence++;
    clearTimeout(s.local);
    clearTimeout(s.remote);
    s.local = setTimeout(() => {
      void localSave()
        .then(() => {
          if (!s.conflicted) setStatus("local");
        })
        .catch((e) => {
          setStatus("error");
          setError(e instanceof Error ? e.message : "Không lưu được nháp trên máy");
        });
    }, 1000);
    s.remote = setTimeout(
      () => void flush(),
      Math.max(0, Math.min(3000, 30000 - (Date.now() - s.firstDirty))),
    );
  }, [options.value, options.revision, options.enabled, ready, recovery, flush, localSave]);
  useEffect(() => {
    const s = state.current;
    const retry = () => void flush(),
      persist = () => void localSave();
    const stop = () => {
      state.current.stopped = true;
      clearTimeout(state.current.local);
      clearTimeout(state.current.remote);
    };
    window.addEventListener("online", retry);
    window.addEventListener("pagehide", persist);
    window.addEventListener("antam-drafts-logout", stop);
    return () => {
      window.removeEventListener("online", retry);
      window.removeEventListener("pagehide", persist);
      window.removeEventListener("antam-drafts-logout", stop);
      clearTimeout(s.local);
      clearTimeout(s.remote);
      void localSave();
    };
  }, [flush, localSave]);
  async function discard() {
    const s = state.current;
    await options.queue.run(async () => {
      s.value = null;
      s.retry = null;
      s.savedSequence = s.sequence;
      s.fingerprint = "";
      s.recovering = false;
      s.conflicted = false;
      clearTimeout(s.local);
      clearTimeout(s.remote);
      if (key) await deleteDraft(`${key}:${writerId}`);
      if (recovery) await deleteDraft(recovery.key);
      if (s.recoveredKey) {
        await deleteDraft(s.recoveredKey);
        s.recoveredKey = null;
      }
    });
    setRecovery(null);
    setStatus("idle");
  }
  function rebase(revision: number) {
    state.current.revision = revision;
    state.current.conflicted = false;
    state.current.retry = null;
    state.current.fingerprint = "";
    setStatus("local");
  }
  async function restore() {
    if (!recovery) return null;
    await latest.current.validateRestore();
    state.current.revision = recovery.revision;
    state.current.value = recovery.value;
    state.current.recoveredKey = recovery.key;
    state.current.firstDirty = Date.now();
    state.current.retry = null;
    state.current.fingerprint = "";
    state.current.recovering = false;
    setRecovery(null);
    return recovery.value;
  }
  return { status, error, savedAt, recovery, flush, discard, rebase, restore };
}
