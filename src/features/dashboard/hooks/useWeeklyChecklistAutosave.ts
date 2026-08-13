"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

import { upsertWeeklyChecklistDraft } from "@/features/dashboard/actions/weeklyChecklistActions";
import type {
  WeeklyChecklistDailyRecord,
  WeeklyChecklistWorshipRecords,
} from "@/features/dashboard/lib/weekly-checklist";
import { toastError } from "@/lib/app-toast";

const DEBOUNCE_MS = 800;

export type WeeklyChecklistAutosaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export type WeeklyChecklistSaveSnapshot = {
  dailyRecords: WeeklyChecklistDailyRecord[];
  worshipRecords: WeeklyChecklistWorshipRecords;
};

type UseWeeklyChecklistAutosaveOptions = {
  weekStartDate: string;
  isSubmitted: boolean;
  dailyRecords: WeeklyChecklistDailyRecord[];
  worshipRecords: WeeklyChecklistWorshipRecords;
  onSaved?: () => void;
};

export function useWeeklyChecklistAutosave({
  weekStartDate,
  onSaved,
}: UseWeeklyChecklistAutosaveOptions) {
  const [status, setStatus] = useState<WeeklyChecklistAutosaveStatus>("idle");
  const isSavingRef = useRef(false);
  const queuedSnapshotRef = useRef<WeeklyChecklistSaveSnapshot | null>(null);
  const hideSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSavedTimer = useCallback(() => {
    if (hideSavedTimerRef.current) {
      clearTimeout(hideSavedTimerRef.current);
      hideSavedTimerRef.current = null;
    }
  }, []);

  const runSave = useCallback(
    async (snapshot: WeeklyChecklistSaveSnapshot) => {
      if (isSavingRef.current) {
        queuedSnapshotRef.current = snapshot;
        return;
      }

      isSavingRef.current = true;
      setStatus("saving");

      const result = await upsertWeeklyChecklistDraft({
        weekStartDate,
        dailyRecords: snapshot.dailyRecords,
        worshipRecords: snapshot.worshipRecords,
      });

      isSavingRef.current = false;

      const queued = queuedSnapshotRef.current;
      if (queued) {
        queuedSnapshotRef.current = null;
        await runSave(queued);
        return;
      }

      if (result.ok) {
        setStatus("saved");
        onSaved?.();
        clearSavedTimer();
        hideSavedTimerRef.current = setTimeout(() => {
          setStatus("idle");
        }, 2500);
        return;
      }

      setStatus("error");
      toastError(result.message);
    },
    [clearSavedTimer, onSaved, weekStartDate],
  );

  const debouncedSave = useDebouncedCallback((snapshot: WeeklyChecklistSaveSnapshot) => {
    void runSave(snapshot);
  }, DEBOUNCE_MS);

  const scheduleSave = useCallback(
    (snapshot: WeeklyChecklistSaveSnapshot) => {
      setStatus("pending");
      debouncedSave(snapshot);
    },
    [debouncedSave],
  );

  const flushPending = useCallback(
    (snapshot?: WeeklyChecklistSaveSnapshot) => {
      debouncedSave.cancel();
      if (snapshot) {
        void runSave(snapshot);
      } else {
        debouncedSave.flush();
      }
    },
    [debouncedSave, runSave],
  );

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        debouncedSave.flush();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      debouncedSave.flush();
      clearSavedTimer();
    };
  }, [clearSavedTimer, debouncedSave]);

  return {
    status,
    scheduleSave,
    flushPending,
  };
}
