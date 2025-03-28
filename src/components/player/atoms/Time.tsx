import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { VideoPlayerButton } from "@/components/player/internals/Button";
import { VideoPlayerTimeFormat } from "@/stores/player/slices/interface";
import { usePlayerStore } from "@/stores/player/store";
import { durationExceedsHour, formatSeconds } from "@/utils/formatSeconds";

export function Time(props: { short?: boolean }) {
  const timeFormat = usePlayerStore((s) => s.interface.timeFormat);
  const setTimeFormat = usePlayerStore((s) => s.setTimeFormat);
  const playbackRate = usePlayerStore((s) => s.mediaPlaying.playbackRate);

  const {
    duration: timeDuration,
    time,
    draggingTime,
  } = usePlayerStore((s) => s.progress);
  const meta = usePlayerStore((s) => s.meta);
  const { isSeeking } = usePlayerStore((s) => s.interface);
  const { t } = useTranslation();
  const hasHours = durationExceedsHour(timeDuration);

  // Use refs to store the last update time and timeout ID
  const lastUpdateRef = useRef<number>(0);
  const timeoutRef = useRef<number | null>(null);

  // Send current time via postMessage with throttling
  useEffect(() => {
    const currentTime = Math.min(
      Math.max(isSeeking ? draggingTime : time, 0),
      timeDuration,
    );

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    const THROTTLE_MS = 1000; // 1 second

    // Clear any existing timeout
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // If enough time has passed, send update immediately
    if (timeSinceLastUpdate >= THROTTLE_MS) {
      window.parent.postMessage(
        {
          type: "playerTimeUpdate",
          time: currentTime,
          duration: timeDuration,
          tmdbId: meta?.tmdbId,
          imdbId: meta?.imdbId,
        },
        "*",
      );
      lastUpdateRef.current = now;
    } else {
      // Otherwise, schedule an update
      timeoutRef.current = window.setTimeout(() => {
        window.parent.postMessage(
          {
            type: "playerTimeUpdate",
            time: currentTime,
            duration: timeDuration,
            tmdbId: meta?.tmdbId,
            imdbId: meta?.imdbId,
          },
          "*",
        );
        lastUpdateRef.current = Date.now();
        timeoutRef.current = null;
      }, THROTTLE_MS - timeSinceLastUpdate);
    }

    // Cleanup function to clear any pending timeout
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [time, draggingTime, isSeeking, timeDuration, meta]);

  function toggleMode() {
    setTimeFormat(
      timeFormat === VideoPlayerTimeFormat.REGULAR
        ? VideoPlayerTimeFormat.REMAINING
        : VideoPlayerTimeFormat.REGULAR,
    );
  }

  const currentTime = Math.min(
    Math.max(isSeeking ? draggingTime : time, 0),
    timeDuration,
  );
  const secondsRemaining = Math.abs(currentTime - timeDuration);

  // Adjust seconds remaining based on playback speed
  const secondsRemainingAdjusted =
    playbackRate > 0 ? secondsRemaining / playbackRate : secondsRemaining;

  const timeLeft = formatSeconds(
    secondsRemaining,
    durationExceedsHour(secondsRemaining),
  );
  const timeWatched = formatSeconds(currentTime, hasHours);
  const timeFinished = new Date(Date.now() + secondsRemainingAdjusted * 1e3);
  const duration = formatSeconds(timeDuration, hasHours);

  let localizationKey =
    timeFormat === VideoPlayerTimeFormat.REGULAR ? "regular" : "remaining";
  if (props.short) {
    localizationKey =
      timeFormat === VideoPlayerTimeFormat.REGULAR
        ? "shortRegular"
        : "shortRemaining";
  }

  return (
    <VideoPlayerButton onClick={() => toggleMode()}>
      <span>
        {t(`player.time.${localizationKey}`, {
          timeFinished,
          timeWatched,
          timeLeft,
          duration,
          formatParams: {
            timeFinished: { hour: "numeric", minute: "numeric" },
          },
        })}
      </span>
    </VideoPlayerButton>
  );
}
