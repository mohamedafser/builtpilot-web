"use client";

import { Download, MonitorSmartphone, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";

type DevicePlatform = "ios" | "android" | "desktop";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "bp_pwa_banner_dismissed";

function detectPlatform(): DevicePlatform {
  if (typeof navigator === "undefined") {
    return "desktop";
  }

  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIOS) {
    return "ios";
  }

  if (/Android/i.test(ua)) {
    return "android";
  }

  return "desktop";
}

function isAppInstalled() {
  if (typeof window === "undefined") {
    return false;
  }

  const standaloneDisplay = window.matchMedia(
    "(display-mode: standalone)",
  ).matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  return standaloneDisplay || iosStandalone;
}

export function PwaInstallBanner() {
  const [platform, setPlatform] = useState<DevicePlatform>("desktop");
  const [isVisible, setIsVisible] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const currentPlatform = detectPlatform();
    setPlatform(currentPlatform);

    if (isAppInstalled()) {
      return;
    }

    const dismissed =
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(DISMISS_KEY) === "1";
    const isTestMode =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("pwa-test") === "1";

    if (!dismissed || isTestMode) {
      setIsVisible(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      if (!isAppInstalled()) {
        setIsVisible(true);
      }
    };

    const handleAppInstalled = () => {
      setIsVisible(false);
      setShowInstructions(false);
      setDeferredPrompt(null);
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (platform === "ios") {
      setShowInstructions((current) => !current);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setIsVisible(false);
      window.sessionStorage.setItem(DISMISS_KEY, "1");
      return;
    }

    setShowInstructions((current) => !current);
  };

  const handleClose = () => {
    setIsVisible(false);
    setShowInstructions(false);
    window.sessionStorage.setItem(DISMISS_KEY, "1");
  };

  if (!isVisible) {
    return null;
  }

  const isAndroid = platform === "android";
  const isDesktop = platform === "desktop";
  const Icon = isDesktop ? MonitorSmartphone : Smartphone;

  return (
    <div className="fixed right-4 bottom-4 z-50 w-[15.5rem] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] sm:right-5 sm:bottom-5">
      <div className="overflow-hidden rounded-2xl border border-stone-200/70 bg-white/90 shadow-[0_20px_50px_-24px_rgba(28,25,23,0.35)] ring-1 ring-amber-100/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5 p-2.5">
          <div className="landing-pwa-pulse flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-[0_8px_20px_-10px_rgba(234,88,12,0.8)]">
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-stone-900">
              Install app
            </p>
            <p className="truncate text-[10px] text-stone-500">
              {isDesktop
                ? "Desktop access"
                : isAndroid
                  ? "Add to home screen"
                  : "Add to home screen"}
            </p>
          </div>

          <button
            type="button"
            aria-label="Close install prompt"
            onClick={handleClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="border-t border-stone-100 px-2.5 py-2">
          <button
            type="button"
            onClick={handleInstall}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-stone-800"
          >
            <Download className="h-3.5 w-3.5" />
            Install BuildPilot
          </button>
        </div>

        {showInstructions ? (
          <div className="border-t border-stone-100 bg-stone-50/90 px-2.5 py-2 text-[10px] leading-4 text-stone-600">
            {isDesktop ? (
              <p>
                Open Chrome or Edge menu → Install app / Install BuildPilot.
              </p>
            ) : isAndroid ? (
              <p>Chrome menu → Install app or Add to Home screen.</p>
            ) : (
              <p>Safari → Share → Add to Home Screen → Add.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
