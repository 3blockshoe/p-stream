import Fuse from "fuse.js";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { FlagIcon } from "@/components/FlagIcon";
import { Menu } from "@/components/player/internals/ContextMenu";
import { Input } from "@/components/player/internals/ContextMenu/Input";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { appLanguageOptions } from "@/setup/i18n";
import { useLanguageStore } from "@/stores/language";
import { getLocaleInfo, sortLangCodes } from "@/utils/language";

import { SelectableLink } from "../../internals/ContextMenu/Links";

export function LanguageView({ id }: { id: string }) {
  const { t } = useTranslation();
  const router = useOverlayRouter(id);
  const { language, setLanguage } = useLanguageStore();
  const [searchQuery, setSearchQuery] = useState("");

  const sorted = sortLangCodes(appLanguageOptions.map((item) => item.code));
  const options = useMemo(() => {
    const input = appLanguageOptions
      .sort((a, b) => sorted.indexOf(a.code) - sorted.indexOf(b.code))
      .map((opt) => ({
        id: opt.code,
        name: `${opt.name}${opt.nativeName ? ` — ${opt.nativeName}` : ""}`,
        leftIcon: <FlagIcon langCode={opt.code} />,
      }));

    if (searchQuery.trim().length > 0) {
      const fuse = new Fuse(input, {
        includeScore: true,
        keys: ["name"],
      });
      return fuse.search(searchQuery).map((res) => res.item);
    }

    return input;
  }, [sorted, searchQuery]);

  const selected = options.find(
    (item) => item.id === getLocaleInfo(language)?.code,
  );

  const handleLanguageChange = useCallback(
    (newLanguage: string) => {
      setLanguage(newLanguage);
    },
    [setLanguage],
  );

  return (
    <>
      <Menu.BackLink onClick={() => router.navigate("/")}>
        {t("settings.preferences.language")}
      </Menu.BackLink>
      <div className="mt-3">
        <Input value={searchQuery} onInput={setSearchQuery} />
      </div>
      <Menu.Section className="flex flex-col pb-4">
        {options.map((option) => (
          <SelectableLink
            key={option.id}
            selected={selected?.id === option.id}
            onClick={() => handleLanguageChange(option.id)}
          >
            <span className="flex items-center">
              <span data-code={option.id} className="mr-3 inline-flex">
                {option.leftIcon}
              </span>
              <span>{option.name}</span>
            </span>
          </SelectableLink>
        ))}
      </Menu.Section>
    </>
  );
}
