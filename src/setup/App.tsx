import { ReactElement, Suspense, lazy, useEffect, useState } from "react";
import { lazyWithPreload } from "react-lazy-with-preload";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";

import {
  convertEmbedUrl,
  convertLegacyUrl,
  isEmbedUrl,
  isLegacyUrl,
} from "@/backend/metadata/getmeta";
import { NotificationModal } from "@/components/overlays/notificationsModal";
import { useOnlineListener } from "@/hooks/usePing";
import { AdminPage } from "@/pages/admin/AdminPage";
import { AllBookmarks } from "@/pages/bookmarks/AllBookmarks";
import VideoTesterView from "@/pages/developer/VideoTesterView";
import { DiscoverMore } from "@/pages/discover/AllMovieLists";
import { Discover } from "@/pages/discover/Discover";
import { MoreContent } from "@/pages/discover/MoreContent";
import MaintenancePage from "@/pages/errors/MaintenancePage";
import { NotFoundPage } from "@/pages/errors/NotFoundPage";
import { JipPage } from "@/pages/Jip";
import { LegalPage, shouldHaveLegalPage } from "@/pages/Legal";
import { OnboardingPage } from "@/pages/onboarding/Onboarding";
import { OnboardingExtensionPage } from "@/pages/onboarding/OnboardingExtension";
import { OnboardingProxyPage } from "@/pages/onboarding/OnboardingProxy";
import { SupportPage } from "@/pages/Support";
import { Layout } from "@/setup/Layout";
import { useHistoryListener } from "@/stores/history";
import { LanguageProvider, useLanguageStore } from "@/stores/language";
import { ThemeProvider, useThemeStore } from "@/stores/theme";

const DeveloperPage = lazy(() => import("@/pages/DeveloperPage"));
const TestView = lazy(() => import("@/pages/developer/TestView"));
const PlayerView = lazyWithPreload(() => import("@/pages/PlayerView"));
const SettingsPage = lazyWithPreload(() => import("@/pages/Settings"));

PlayerView.preload();
SettingsPage.preload();

function LegacyUrlView({ children }: { children: ReactElement }) {
  const location = useLocation();
  const navigate = useNavigate();
  const setTheme = useThemeStore((s) => s.setTheme);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  useEffect(() => {
    const url = location.pathname;
    if (!isLegacyUrl(url)) return;
    convertLegacyUrl(url).then((convertedUrl) => {
      navigate(convertedUrl ?? "/", { replace: true });
    });
  }, [location.pathname, navigate]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const theme = searchParams.get("theme");
    const language = searchParams.get("language");

    if (theme) {
      setTheme(theme);
    }
    if (language) {
      setLanguage(language);
    }
  }, [location.search, setTheme, setLanguage]);

  if (isLegacyUrl(location.pathname)) return null;
  return children;
}

export const maintenanceTime = "March 31th 11:00 PM - 5:00 AM EST";

function App() {
  useHistoryListener();
  useOnlineListener();
  const maintenance = false; // Shows maintance page
  const [showDowntime, setShowDowntime] = useState(maintenance);

  const handleButtonClick = () => {
    setShowDowntime(false);
  };

  useEffect(() => {
    const sessionToken = sessionStorage.getItem("downtimeToken");
    if (!sessionToken && maintenance) {
      setShowDowntime(true);
      sessionStorage.setItem("downtimeToken", "true");
    }
  }, [setShowDowntime, maintenance]);

  function EmbedRedirectView({ children }: { children: ReactElement }) {
    const location = useLocation();
    const navigate = useNavigate();
    const setTheme = useThemeStore((s) => s.setTheme);
    const setLanguage = useLanguageStore((s) => s.setLanguage);

    useEffect(() => {
      const url = location.pathname;
      if (!isEmbedUrl(url)) return;
      convertEmbedUrl(url).then((convertedUrl) => {
        navigate(convertedUrl ?? "/", { replace: true });
      });
    }, [location.pathname, navigate]);

    useEffect(() => {
      const searchParams = new URLSearchParams(location.search);
      const theme = searchParams.get("theme");
      const language = searchParams.get("language");

      if (theme) {
        setTheme(theme);
      }
      if (language) {
        setLanguage(language);
      }
    }, [location.search, setTheme, setLanguage]);

    if (isEmbedUrl(location.pathname)) return null;
    return children;
  }

  return (
    <Layout>
      <ThemeProvider />
      <LanguageProvider />
      <NotificationModal id="notifications" />
      {!showDowntime && (
        <Routes>
          {/* pages */}
          <Route
            path="/embed/:media"
            element={
              <EmbedRedirectView>
                <Suspense fallback={null}>
                  <PlayerView />
                </Suspense>
              </EmbedRedirectView>
            }
          />
          <Route
            path="/embed/:media/:seasonNumber/:episodeNumber"
            element={
              <EmbedRedirectView>
                <Suspense fallback={null}>
                  <PlayerView />
                </Suspense>
              </EmbedRedirectView>
            }
          />
          <Route
            path="/media/:media"
            element={
              <LegacyUrlView>
                <Suspense fallback={null}>
                  <PlayerView />
                </Suspense>
              </LegacyUrlView>
            }
          />
          <Route
            path="/media/:media/:season/:episode"
            element={
              <LegacyUrlView>
                <Suspense fallback={null}>
                  <PlayerView />
                </Suspense>
              </LegacyUrlView>
            }
          />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route
            path="/onboarding/extension"
            element={<OnboardingExtensionPage />}
          />
          <Route path="/onboarding/proxy" element={<OnboardingProxyPage />} />

          {shouldHaveLegalPage() ? (
            <Route path="/legal" element={<LegalPage />} />
          ) : null}
          {/* Support page */}
          <Route path="/support" element={<SupportPage />} />
          <Route path="/jip" element={<JipPage />} />
          {/* Discover pages */}
          <Route path="/discover" element={<Discover />} />
          <Route
            path="/discover/more/:contentType/:mediaType"
            element={<MoreContent />}
          />
          <Route
            path="/discover/more/:contentType/:id/:mediaType"
            element={<MoreContent />}
          />
          <Route path="/discover/more/:category" element={<MoreContent />} />
          <Route path="/discover/all" element={<DiscoverMore />} />
          {/* Bookmarks page */}
          <Route path="/bookmarks" element={<AllBookmarks />} />
          {/* Settings page */}
          <Route
            path="/settings"
            element={
              <Suspense fallback={null}>
                <SettingsPage />
              </Suspense>
            }
          />
          {/* admin routes */}
          <Route path="/admin" element={<AdminPage />} />
          {/* other */}
          <Route path="/dev" element={<DeveloperPage />} />
          <Route path="/dev/video" element={<VideoTesterView />} />
          {/* developer routes that can abuse workers are disabled in production */}
          {process.env.NODE_ENV === "development" ? (
            <Route path="/dev/test" element={<TestView />} />
          ) : null}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      )}
      {showDowntime && (
        <MaintenancePage onHomeButtonClick={handleButtonClick} />
      )}
    </Layout>
  );
}

export default App;
