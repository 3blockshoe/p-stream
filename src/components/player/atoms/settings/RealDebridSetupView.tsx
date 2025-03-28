import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

import { Button } from "@/components/buttons/Button";
import { Icon, Icons } from "@/components/Icon";
import { Menu } from "@/components/player/internals/ContextMenu";
import {
  StatusCircle,
  StatusCircleProps,
} from "@/components/player/internals/StatusCircle";
import { MwLink } from "@/components/text/Link";
import { AuthInputBox } from "@/components/text-inputs/AuthInputBox";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { Status, testRealDebridKey } from "@/pages/parts/settings/SetupPart";
import { usePreferencesStore } from "@/stores/preferences";

async function getRealDebridKeyStatus(realDebridKey: string | null) {
  if (realDebridKey) {
    const status: Status = await testRealDebridKey(realDebridKey);
    return status;
  }
  return "unset";
}

export function RealDebridSetupView({ id }: { id: string }) {
  const { t } = useTranslation();
  const router = useOverlayRouter(id);
  const realDebridKey = usePreferencesStore((s) => s.realDebridKey);
  const setRealDebridKey = usePreferencesStore((s) => s.setRealDebridKey);
  const [status, setStatus] = useState<Status>("unset");
  const statusMap: Record<Status, StatusCircleProps["type"]> = {
    error: "error",
    success: "success",
    unset: "noresult",
    api_down: "error",
    invalid_token: "error",
  };

  useEffect(() => {
    const checkKeyStatus = async () => {
      const result = await getRealDebridKeyStatus(realDebridKey);
      setStatus(result);
    };
    checkKeyStatus();
  }, [realDebridKey]);

  const handleReload = () => {
    window.location.reload();
  };

  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ((status === "success" || status === "error") && alertRef.current) {
      alertRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [status]);

  return (
    <>
      <Menu.BackLink onClick={() => router.navigate("/source")}>
        Real Debrid Setup
      </Menu.BackLink>
      <Menu.Section className="pb-4">
        <div className="my-3">
          <p className="max-w-[30rem] font-medium">
            <Trans i18nKey="realdebrid.description">
              Real Debrid is a premium download service that allows you to
              download files instantly from many file hosts.
              <br />
              <MwLink>
                <a
                  href="https://real-debrid.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  real-debrid.com
                </a>
              </MwLink>
            </Trans>
          </p>
        </div>

        <div className="mt-6">
          <p className="text-white font-bold mb-3">
            {t("realdebrid.tokenLabel", "API Key")}
          </p>
          <div className="flex items-center w-full">
            <StatusCircle type={statusMap[status]} className="mx-2 mr-4" />
            <AuthInputBox
              onChange={(newKey) => {
                setRealDebridKey(newKey);
              }}
              value={realDebridKey ?? ""}
              placeholder="ABC123..."
              passwordToggleable
              className="flex-grow"
            />
          </div>
          {status === "error" && (
            <p ref={alertRef} className="text-type-danger mt-4">
              {t("realdebrid.status.failure")}
            </p>
          )}
          {status === "api_down" && (
            <p ref={alertRef} className="text-type-danger mt-4">
              {t("realdebrid.status.api_down")}
            </p>
          )}
          {status === "invalid_token" && (
            <p ref={alertRef} className="text-type-danger mt-4">
              {t("realdebrid.status.invalid_token")}
            </p>
          )}
          {status === "success" && (
            <div ref={alertRef} className="mt-4">
              <Button theme="purple" onClick={handleReload}>
                Continue
              </Button>
            </div>
          )}
        </div>
      </Menu.Section>
    </>
  );
}
