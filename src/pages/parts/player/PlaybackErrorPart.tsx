import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/buttons/Button";
import { Icons } from "@/components/Icon";
import { IconPill } from "@/components/layout/IconPill";
import { useModal } from "@/components/overlays/Modal";
import { Paragraph } from "@/components/text/Paragraph";
import { Title } from "@/components/text/Title";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { ErrorContainer, ErrorLayout } from "@/pages/layouts/ErrorLayout";
import { usePlayerStore } from "@/stores/player/store";

import { ErrorCardInModal } from "../errors/ErrorCard";

export function PlaybackErrorPart() {
  const { t } = useTranslation();
  const playbackError = usePlayerStore((s) => s.interface.error);
  const modal = useModal("error");
  const settingsRouter = useOverlayRouter("settings");
  const hasOpenedSettings = useRef(false);

  // Automatically open the settings overlay when a playback error occurs
  useEffect(() => {
    if (playbackError && !hasOpenedSettings.current) {
      hasOpenedSettings.current = true;
      settingsRouter.open();
      settingsRouter.navigate("/source");
    }
  }, [playbackError, settingsRouter]);

  const handleOpenSourcePicker = () => {
    settingsRouter.open();
    settingsRouter.navigate("/source");
  };

  return (
    <ErrorLayout>
      <ErrorContainer>
        <IconPill icon={Icons.WAND}>{t("player.playbackError.badge")}</IconPill>
        <Title>{t("player.playbackError.title")}</Title>
        <Paragraph>{t("player.playbackError.text")}</Paragraph>
        <div className="flex gap-3">
          <Button
            onClick={() => modal.show()}
            theme="danger"
            padding="md:px-12 p-2.5"
            className="mt-6"
          >
            {t("errors.showError")}
          </Button>
          <Button
            onClick={handleOpenSourcePicker}
            theme="purple"
            padding="md:px-12 p-2.5"
            className="mt-6"
          >
            {t("player.menus.sources.title")}
          </Button>
        </div>
        <div className="flex gap-3">
          {(() => {
            const backlink = new URLSearchParams(window.location.search).get(
              "backlink",
            );

            // Only show backlink if it comes from URL parameter, and strip any quotes
            if (backlink) {
              // Remove any surrounding quotes from the URL
              const cleanUrl = backlink.replace(/^["'](.*)["']$/, "$1");

              return (
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    window.parent.location.href = cleanUrl;
                  }}
                  theme="secondary"
                  padding="md:px-12 p-2.5"
                  className="mt-6"
                >
                  {t("player.scraping.notFound.homeButton")}
                </Button>
              );
            }
            return null;
          })()}
          <Button
            theme="secondary"
            padding="md:px-12 p-2.5"
            className="mt-6"
            onClick={(e) => {
              e.preventDefault();
              window.location.reload();
            }}
          >
            {t("errors.reloadPage")}
          </Button>
        </div>
      </ErrorContainer>
      {/* Error */}
      <ErrorCardInModal
        onClose={() => modal.hide()}
        error={playbackError}
        id={modal.id}
      />
    </ErrorLayout>
  );
}
