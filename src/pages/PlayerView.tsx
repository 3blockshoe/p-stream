/* eslint-disable no-console */
import { RunOutput } from "@p-stream/providers";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useAsync } from "react-use";

import { DetailedMeta } from "@/backend/metadata/getmeta";
import { usePlayer } from "@/components/player/hooks/usePlayer";
import { usePlayerMeta } from "@/components/player/hooks/usePlayerMeta";
import { convertProviderCaption } from "@/components/player/utils/captions";
import { convertRunoutputToSource } from "@/components/player/utils/convertRunoutputToSource";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { ScrapingItems, ScrapingSegment } from "@/hooks/useProviderScrape";
import { useQueryParam } from "@/hooks/useQueryParams";
import { MetaPart } from "@/pages/parts/player/MetaPart";
import { PlaybackErrorPart } from "@/pages/parts/player/PlaybackErrorPart";
import { PlayerPart } from "@/pages/parts/player/PlayerPart";
import { ResumePart } from "@/pages/parts/player/ResumePart";
import { ScrapeErrorPart } from "@/pages/parts/player/ScrapeErrorPart";
import { ScrapingPart } from "@/pages/parts/player/ScrapingPart";
import { useLastNonPlayerLink } from "@/stores/history";
import { PlayerMeta, playerStatus } from "@/stores/player/slices/source";
import { useProgressStore } from "@/stores/progress";
import { needsOnboarding } from "@/utils/onboarding";
import { parseTimestamp } from "@/utils/timestamp";

export function RealPlayerView() {
  const navigate = useNavigate();
  const params = useParams<{
    media: string;
    episode?: string;
    season?: string;
  }>();
  const [errorData, setErrorData] = useState<{
    sources: Record<string, ScrapingSegment>;
    sourceOrder: ScrapingItems[];
  } | null>(null);
  const [startAtParam] = useQueryParam("t");
  const {
    status,
    playMedia,
    reset,
    setScrapeNotFound,
    shouldStartFromBeginning,
    setShouldStartFromBeginning,
    setStatus,
  } = usePlayer();
  const { setPlayerMeta, scrapeMedia } = usePlayerMeta();
  const backUrl = useLastNonPlayerLink();
  const router = useOverlayRouter("settings");
  const openedWatchPartyRef = useRef<boolean>(false);
  const progressItems = useProgressStore((s) => s.items);

  const paramsData = JSON.stringify({
    media: params.media,
    season: params.season,
    episode: params.episode,
  });
  useEffect(() => {
    reset();
    // Reset watch party state when media changes
    openedWatchPartyRef.current = false;
  }, [paramsData, reset]);

  // Auto-open watch party menu if URL contains watchparty parameter
  useEffect(() => {
    if (openedWatchPartyRef.current) return;

    if (status === playerStatus.PLAYING) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has("watchparty")) {
        setTimeout(() => {
          router.navigate("/watchparty");
          openedWatchPartyRef.current = true;
        }, 1000);
      }
    }
  }, [status, router]);

  const metaChange = useCallback(
    (meta: PlayerMeta) => {
      if (meta?.type === "show")
        navigate(
          `/media/${params.media}/${meta.season?.tmdbId}/${meta.episode?.tmdbId}`,
        );
      else navigate(`/media/${params.media}`);
    },
    [navigate, params],
  );

  // Check if episode is more than 80% watched
  const shouldShowResumeScreen = useCallback(
    (meta: PlayerMeta) => {
      if (!meta?.tmdbId) return false;

      const item = progressItems[meta.tmdbId];
      if (!item) return false;

      if (meta.type === "movie") {
        if (!item.progress) return false;
        const percentage =
          (item.progress.watched / item.progress.duration) * 100;
        return percentage > 80;
      }

      if (meta.type === "show" && meta.episode?.tmdbId) {
        const episode = item.episodes?.[meta.episode.tmdbId];
        if (!episode) return false;
        const percentage =
          (episode.progress.watched / episode.progress.duration) * 100;
        return percentage > 80;
      }

      return false;
    },
    [progressItems],
  );

  const handleMetaReceived = useCallback(
    (detailedMeta: DetailedMeta, episodeId?: string) => {
      const playerMeta = setPlayerMeta(detailedMeta, episodeId);
      if (playerMeta && shouldShowResumeScreen(playerMeta)) {
        setStatus(playerStatus.RESUME);
      }
    },
    [shouldShowResumeScreen, setStatus, setPlayerMeta],
  );

  const handleResume = useCallback(() => {
    setStatus(playerStatus.SCRAPING);
  }, [setStatus]);

  const handleRestart = useCallback(() => {
    setShouldStartFromBeginning(true);
    setStatus(playerStatus.SCRAPING);
  }, [setShouldStartFromBeginning, setStatus]);

  const playAfterScrape = useCallback(
    (out: RunOutput | null) => {
      if (!out) return;

      let startAt: number | undefined;
      if (startAtParam) startAt = parseTimestamp(startAtParam) ?? undefined;

      playMedia(
        convertRunoutputToSource(out),
        convertProviderCaption(out.stream.captions),
        out.sourceId,
        shouldStartFromBeginning ? 0 : startAt,
      );
      setShouldStartFromBeginning(false);

      // Start background scraping for fallback streams
      // This runs asynchronously and won't block the UI
      setTimeout(async () => {
        if (!scrapeMedia) return;
        try {
          // Use the providers directly for background scraping
          const { getProviders } = await import(
            "@/backend/providers/providers"
          );
          const { getLoadbalancedProviderApiUrl } = await import(
            "@/backend/providers/fetchers"
          );
          const { isExtensionActiveCached } = await import(
            "@/backend/extension/messaging"
          );
          const { connectServerSideEvents, makeProviderUrl } = await import(
            "@/backend/helpers/providerApi"
          );
          const { prepareStream } = await import("@/backend/extension/streams");
          const { usePlayerStore } = await import("@/stores/player/store");

          const addFallbackStream = usePlayerStore.getState().addFallbackStream;
          const providerApiUrl = getLoadbalancedProviderApiUrl();

          if (providerApiUrl && !isExtensionActiveCached()) {
            // Use SSE for background scraping
            const baseUrlMaker = makeProviderUrl(providerApiUrl);
            const conn = await connectServerSideEvents<RunOutput | "">(
              baseUrlMaker.scrapeAll(scrapeMedia),
              ["completed", "noOutput"],
            );
            const sseOutput = await conn.promise();
            if (sseOutput && typeof sseOutput !== "string") {
              if (isExtensionActiveCached())
                await prepareStream(sseOutput.stream);
              const stream = convertRunoutputToSource(sseOutput);
              const captions = convertProviderCaption(
                sseOutput.stream.captions,
              );
              addFallbackStream(stream, captions, sseOutput.sourceId);
              console.log("Background scraping completed for fallback streams");
            }
          } else {
            // Use local providers for background scraping
            const providers = getProviders();
            const output = await providers.runAll({
              media: scrapeMedia,
              events: {
                init: () => {},
                start: () => {},
                update: () => {},
                discoverEmbeds: () => {},
              },
            });
            if (output) {
              if (isExtensionActiveCached()) await prepareStream(output.stream);
              const stream = convertRunoutputToSource(output);
              const captions = convertProviderCaption(output.stream.captions);
              addFallbackStream(stream, captions, output.sourceId);
              console.log("Background scraping completed for fallback streams");
            }
          }
        } catch (error) {
          console.log("Background scraping failed:", error);
        }
      }, 2000); // Wait 2 seconds before starting background scraping
    },
    [
      playMedia,
      startAtParam,
      shouldStartFromBeginning,
      setShouldStartFromBeginning,
      scrapeMedia,
    ],
  );

  return (
    <PlayerPart backUrl={backUrl} onMetaChange={metaChange}>
      {status === playerStatus.IDLE ? (
        <MetaPart onGetMeta={handleMetaReceived} />
      ) : null}
      {status === playerStatus.RESUME ? (
        <ResumePart
          onResume={handleResume}
          onRestart={handleRestart}
          onMetaChange={metaChange}
        />
      ) : null}
      {status === playerStatus.SCRAPING && scrapeMedia ? (
        <ScrapingPart
          media={scrapeMedia}
          onResult={(sources, sourceOrder) => {
            setErrorData({
              sourceOrder,
              sources,
            });
            setScrapeNotFound();
          }}
          onGetStream={playAfterScrape}
        />
      ) : null}
      {status === playerStatus.SCRAPE_NOT_FOUND && errorData ? (
        <ScrapeErrorPart data={errorData} />
      ) : null}
      {status === playerStatus.PLAYBACK_ERROR ? <PlaybackErrorPart /> : null}
    </PlayerPart>
  );
}

export function PlayerView() {
  const loc = useLocation();
  const { loading, error, value } = useAsync(() => {
    return needsOnboarding();
  });

  if (error) throw new Error("Failed to detect onboarding");
  if (loading) return null;
  if (value)
    return (
      <Navigate
        replace
        to={{
          pathname: "/onboarding",
          search: `redirect=${encodeURIComponent(loc.pathname)}`,
        }}
      />
    );
  return <RealPlayerView />;
}

export default PlayerView;
