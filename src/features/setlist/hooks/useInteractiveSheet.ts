"use client";

import { useEffect, useMemo, useState } from "react";

export type SheetMarkerType = "chord" | "structure";

export type InteractiveSheetMarker = {
  id: string;
  type: SheetMarkerType;
  value: string;
  x: number;
  y: number;
};

export function useInteractiveSheet(initialMarkers: InteractiveSheetMarker[] = []) {
  const [markers, setMarkers] = useState<InteractiveSheetMarker[]>(initialMarkers);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedTab, setSelectedTab] = useState<SheetMarkerType>("chord");
  const [draftValue, setDraftValue] = useState("");
  const [sequenceTop, setSequenceTop] = useState("");
  const [sequenceBottom, setSequenceBottom] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const selectedMarker = useMemo(
    () => markers.find((marker) => marker.id === selectedMarkerId) ?? null,
    [markers, selectedMarkerId],
  );

  useEffect(() => {
    if (selectedMarker) {
      setSelectedTab(selectedMarker.type);
      setDraftValue(selectedMarker.value);
      setPopupPosition({ x: selectedMarker.x, y: selectedMarker.y });
      setIsEditing(true);
    }
  }, [selectedMarker]);

  const openEditor = (x: number, y: number, marker?: InteractiveSheetMarker) => {
    setPopupPosition({ x, y });
    setIsEditing(true);
    if (marker) {
      setSelectedMarkerId(marker.id);
      setSelectedTab(marker.type);
      setDraftValue(marker.value);
    } else {
      setSelectedMarkerId(null);
      setSelectedTab("chord");
      setDraftValue("");
    }
  };

  const closeEditor = () => {
    setPopupPosition(null);
    setSelectedMarkerId(null);
    setIsEditing(false);
    setDraftValue("");
  };

  const handleCanvasClick = (x: number, y: number) => {
    openEditor(x, y);
  };

  const handleMarkerClick = (marker: InteractiveSheetMarker) => {
    setSelectedMarkerId(marker.id);
  };

  const handleSaveMarker = () => {
    const normalizedValue = draftValue.trim();
    if (normalizedValue.length === 0 || popupPosition === null) return;

    if (selectedMarkerId) {
      setMarkers((current) =>
        current.map((marker) =>
          marker.id === selectedMarkerId
            ? { ...marker, type: selectedTab, value: normalizedValue, x: popupPosition.x, y: popupPosition.y }
            : marker,
        ),
      );
    } else {
      setMarkers((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          type: selectedTab,
          value: normalizedValue,
          x: popupPosition.x,
          y: popupPosition.y,
        },
      ]);
    }

    closeEditor();
  };

  const handleDeleteMarker = () => {
    if (!selectedMarkerId) return;
    setMarkers((current) => current.filter((marker) => marker.id !== selectedMarkerId));
    closeEditor();
  };

  const addMarkers = (nextMarkers: InteractiveSheetMarker[]) => {
    setMarkers((current) => [...current, ...nextMarkers]);
  };

  return {
    markers,
    selectedMarker,
    selectedMarkerId,
    popupPosition,
    selectedTab,
    draftValue,
    sequenceTop,
    sequenceBottom,
    isEditing,
    handleCanvasClick,
    handleMarkerClick,
    handleSaveMarker,
    handleDeleteMarker,
    closeEditor,
    addMarkers,
    setSelectedTab,
    setDraftValue,
    setSequenceTop,
    setSequenceBottom,
  };
}
