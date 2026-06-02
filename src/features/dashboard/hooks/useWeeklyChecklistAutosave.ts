"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

import { upsertWeeklyChecklistDraft } from "@/features/dashboard/actions/weeklyChecklistActions";
import type {
  WeeklyChecklistDailyRecord,
  WeeklyChecklistWorshipRecords,
} from "@/features/dashboard/lib/weekly-checklist";
import { toastError } from "@/lib/app-toast";

const DEBOUNCE_MS = 1500;

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
  dailyRecords,
  worshipRecords,
  onSaved,
}: UseWeeklyChecklistAutosaveOptions) {
  const [status, setStatus] = useState<WeeklyChecklistAutosaveStatus>("idle");
  const isSavingRef = useRef(false);
  const hideSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dailyRef = useRef(dailyRecords);
  const worshipRef = useRef(worshipRecords);
  dailyRef.current = dailyRecords;
  worshipRef.current = worshipRecords;

  const getSnapshot = useCallback(
    (override?: WeeklyChecklistSaveSnapshot): WeeklyChecklistSaveSnapshot => ({
      dailyRecords: override?.dailyRecords ?? dailyRef.current,
      worshipRecords: override?.worshipRecords ?? worshipRef.current,
    }),
    [],
  );

  const clearSavedTimer = useCallback(() => {
    if (hideSavedTimerRef.current) {
      clearTimeout(hideSavedTimerRef.current);
      hideSavedTimerRef.current = null;
    }
  }, []);

  const runSave = useCallback(
    async (override?: WeeklyChecklistSaveSnapshot) => {
      if (isSavingRef.current) return;

      const snapshot = getSnapshot(override);

      isSavingRef.current = true;
      setStatus("saving");

      const result = await upsertWeeklyChecklistDraft({
        weekStartDate,
        dailyRecords: snapshot.dailyRecords,
        worshipRecords: snapshot.worshipRecords,
      });

      isSavingRef.current = false;

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
    [clearSavedTimer, getSnapshot, onSaved, weekStartDate],
  );

  const debouncedSave = useDebouncedCallback(
    (override?: WeeklyChecklistSaveSnapshot) => {
      void runSave(override);
    },
    DEBOUNCE_MS,
  );

  const scheduleDebouncedSave = useCallback(
    (override?: WeeklyChecklistSaveSnapshot) => {
      setStatus("pending");
      debouncedSave(override);
    },
    [debouncedSave],
  );

  const saveImmediately = useCallback(
    (override?: WeeklyChecklistSaveSnapshot) => {
      debouncedSave.cancel();
      void runSave(override);
    },
    [debouncedSave, runSave],
  );

  const flushPending = useCallback(
    (override?: WeeklyChecklistSaveSnapshot) => {
      debouncedSave.cancel();
      void runSave(override ?? getSnapshot());
    },
    [debouncedSave, getSnapshot, runSave],
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
    scheduleDebouncedSave,
    saveImmediately,
    flushPending,
  };
}
