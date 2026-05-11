import { create } from "zustand";

import { getYoutubeVideoId } from "@/features/setlist/utils/youtube";

export type SetlistPlayerTrack = {
  songId: string;
  title: string;
  youtubeUrl: string | null;
  videoId: string;
};

type SetlistStore = {
  current: SetlistPlayerTrack | null;
  setCurrent: (track: SetlistPlayerTrack | null) => void;
  playSong: (input: {
    songId: string;
    title: string;
    youtubeUrl: string | null;
  }) => void;
  stop: () => void;
};

export const useSetlistStore = create<SetlistStore>((set) => ({
  current: null,
  setCurrent: (track) => set({ current: track }),
  playSong: ({ songId, title, youtubeUrl }) => {
    const videoId = getYoutubeVideoId(youtubeUrl);
    if (!videoId) {
      set({ current: null });
      return;
    }
    set({
      current: { songId, title, youtubeUrl, videoId },
    });
  },
  stop: () => set({ current: null }),
}));
