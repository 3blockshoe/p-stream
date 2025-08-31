/* eslint-disable no-console */
import { DisplayInterface } from "@/components/player/display/displayInterface";
import { playerStatus } from "@/stores/player/slices/source";
import { MakeSlice } from "@/stores/player/slices/types";

export interface DisplaySlice {
  display: DisplayInterface | null;
  // Buffering and fallback tracking
  bufferingStartTime: number | null;
  bufferingTimeout: NodeJS.Timeout | null;
  setDisplay(display: DisplayInterface | null): void;
  reset(): void;
  // Fallback methods
  tryFallbackStream(): boolean;
  startBufferingTimer(): void;
  stopBufferingTimer(): void;
}

export const createDisplaySlice: MakeSlice<DisplaySlice> = (set, get) => ({
  display: null,
  bufferingStartTime: null,
  bufferingTimeout: null,
  setDisplay(newDisplay: DisplayInterface | null) {
    const display = get().display;
    if (display) display.destroy();

    if (!newDisplay) {
      set((s) => {
        s.display = null;
      });
      return;
    }

    // make display events update the state
    newDisplay.on("pause", () =>
      set((s) => {
        s.mediaPlaying.isPaused = true;
        s.mediaPlaying.isPlaying = false;
      }),
    );
    newDisplay.on("play", () =>
      set((s) => {
        s.mediaPlaying.hasPlayedOnce = true;
        s.mediaPlaying.isPaused = false;
        s.mediaPlaying.isPlaying = true;
      }),
    );
    newDisplay.on("fullscreen", (isFullscreen) =>
      set((s) => {
        s.interface.isFullscreen = isFullscreen;
      }),
    );
    newDisplay.on("time", (time) =>
      set((s) => {
        s.progress.time = time;
      }),
    );
    newDisplay.on("volumechange", (vol) =>
      set((s) => {
        s.mediaPlaying.volume = vol;
      }),
    );
    newDisplay.on("duration", (duration) =>
      set((s) => {
        s.progress.duration = duration;
      }),
    );
    newDisplay.on("buffered", (buffered) =>
      set((s) => {
        s.progress.buffered = buffered;
      }),
    );
    newDisplay.on("loading", (isLoading) => {
      const store = get();
      if (isLoading) {
        store.startBufferingTimer();
      } else {
        store.stopBufferingTimer();
      }
      set((s) => {
        s.mediaPlaying.isLoading = isLoading;
      });
    });
    newDisplay.on("qualities", (qualities) => {
      set((s) => {
        s.qualities = qualities;
      });
    });
    newDisplay.on("changedquality", (quality) => {
      set((s) => {
        s.currentQuality = quality;
      });
    });
    newDisplay.on("audiotracks", (audioTracks) => {
      set((s) => {
        s.audioTracks = audioTracks;
      });
    });
    newDisplay.on("changedaudiotrack", (audioTrack) => {
      set((s) => {
        s.currentAudioTrack = audioTrack;
      });
    });
    newDisplay.on("needstrack", (needsTrack) => {
      set((s) => {
        s.caption.asTrack = needsTrack;
      });
    });
    newDisplay.on("canairplay", (canAirplay) => {
      set((s) => {
        s.interface.canAirplay = canAirplay;
      });
    });
    newDisplay.on("playbackrate", (rate) => {
      set((s) => {
        s.mediaPlaying.playbackRate = rate;
      });
    });
    newDisplay.on("error", (err) => {
      const store = get();
      store.stopBufferingTimer();

      // Try fallback stream before setting error status
      if (!store.tryFallbackStream()) {
        set((s) => {
          s.status = playerStatus.PLAYBACK_ERROR;
          s.interface.error = err;
        });
      }
    });

    set((s) => {
      s.display = newDisplay;
    });
  },
  reset() {
    const store = get();
    store.stopBufferingTimer();
    store.display?.load({
      source: null,
      startAt: 0,
      automaticQuality: false,
      preferredQuality: null,
    });
    set((s) => {
      s.status = playerStatus.IDLE;
      s.meta = null;
      s.thumbnails.images = [];
      s.progress.time = 0;
      s.progress.duration = 0;
      s.bufferingStartTime = null;
      s.bufferingTimeout = null;
    });
  },
  startBufferingTimer() {
    const store = get();
    if (store.bufferingStartTime) return; // Already started

    const startTime = Date.now();
    set((s) => {
      s.bufferingStartTime = startTime;
    });

    // Set timeout for 30 seconds
    const timeout = setTimeout(() => {
      const currentStore = get();
      if (currentStore.bufferingStartTime === startTime) {
        // Still buffering after 30 seconds, try fallback
        console.log(
          "Buffering for more than 30 seconds, trying fallback stream",
        );
        currentStore.tryFallbackStream();
      }
    }, 30000);

    set((s) => {
      s.bufferingTimeout = timeout;
    });
  },
  stopBufferingTimer() {
    const store = get();
    if (store.bufferingTimeout) {
      clearTimeout(store.bufferingTimeout);
    }
    set((s) => {
      s.bufferingStartTime = null;
      s.bufferingTimeout = null;
    });
  },
  tryFallbackStream(): boolean {
    const store = get();
    const fallbackStream = store.getFallbackStream();

    if (!fallbackStream) {
      console.log("No fallback streams available");
      return false; // No fallback available
    }

    console.log(
      "Trying fallback stream from",
      fallbackStream.sourceId,
      "with embedId:",
      fallbackStream.embedId,
    );
    console.log("Available fallback streams:", store.fallbackStreams.length);

    // Remove current stream from fallbacks and set the fallback
    store.removeCurrentStreamFromFallbacks();
    store.setSourceId(fallbackStream.sourceId);
    if (fallbackStream.embedId) {
      store.setEmbedId(fallbackStream.embedId);
    }
    store.setSource(
      fallbackStream.stream,
      fallbackStream.captions,
      store.progress.time,
    );

    console.log("Successfully switched to fallback stream");
    return true; // Fallback was used
  },
});
