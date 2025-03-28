import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/buttons/Button";
import { Icons } from "@/components/Icon";
import { IconPill } from "@/components/layout/IconPill";
import { Navigation } from "@/components/layout/Navigation";
import { Title } from "@/components/text/Title";
import { Paragraph } from "@/components/utils/Text";
import { ErrorContainer, ErrorLayout } from "@/pages/layouts/ErrorLayout";

export function NotFoundPart() {
  const { t } = useTranslation();

  return (
    <div className="relative flex flex-1 flex-col">
      <Helmet>
        <title>{t("notFound.badge")}</title>
      </Helmet>
      <div className="flex h-full flex-1 flex-col items-center justify-center p-5 text-center">
        <ErrorLayout>
          <ErrorContainer>
            <IconPill icon={Icons.EYE_SLASH}>{t("notFound.badge")}</IconPill>
            <Title>{t("notFound.title")}</Title>
            <Paragraph>{t("notFound.message")}</Paragraph>
            <Paragraph>
              This page isn&apos;t available on the embed! <br />
              If you believe this is an error, please report it to the{" "}
              <a
                href="https://discord.gg/7z6znYgrTG"
                target="_blank"
                rel="noreferrer"
                className="text-type-link whitespace-nowrap"
              >
                {" "}
                P-Stream Discord
              </a>{" "}
              server.
            </Paragraph>
            <div className="flex gap-3">
              <Button
                onClick={() => window.location.reload()}
                theme="purple"
                padding="md:px-12 p-2.5"
                className="mt-6"
              >
                {t("notFound.reloadButton")}
              </Button>
            </div>
          </ErrorContainer>
        </ErrorLayout>
      </div>
    </div>
  );
}
