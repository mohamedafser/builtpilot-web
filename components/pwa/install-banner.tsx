"use client";

import { Download, Share, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";

type DevicePlatform = "ios" | "android" | "desktop";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function detectPlatform(): DevicePlatform {
  if (typeof navigator === "undefined") {
    return "desktop";
  }

  const ua = navigator.userAgent || "";
  const hasTouchSupport = navigator.maxTouchPoints > 0;
  const isSmallTouchViewport =
    typeof window !== "undefined" &&
    window.innerWidth <= 768 &&
    (window.matchMedia("(pointer: coarse)").matches || hasTouchSupport);

  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIOS) {
    return "ios";
  }

  if (/Android/i.test(ua) || isSmallTouchViewport) {
    return "android";
  }

  return "desktop";
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

    const isStandalone =
      typeof window !== "undefined" &&
      window.matchMedia("(display-mode: standalone)").matches;
    const isTestMode =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("pwa-test") === "1";
    const shouldShowOnMobileViewport =
      typeof window !== "undefined" &&
      window.innerWidth <= 768 &&
      (window.matchMedia("(pointer: coarse)").matches ||
        navigator.maxTouchPoints > 0);

    if (
      (currentPlatform !== "desktop" ||
        isTestMode ||
        shouldShowOnMobileViewport) &&
      !isStandalone
    ) {
      setIsVisible(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setIsVisible(false);
      setShowInstructions(false);
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
      setShowInstructions(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setIsVisible(false);
      return;
    }

    setShowInstructions(true);
  };

  if (!isVisible || platform === "desktop") {
    return null;
  }

  const isAndroid = platform === "android";

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-3 sm:px-6">
      <div className="w-full max-w-6xl rounded-[28px] border border-amber-900/20 bg-[#4e3627] px-4 py-4 text-stone-50 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.45)] sm:px-6 sm:py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-stone-200/20 ring-1 ring-white/10">
            <Smartphone className="h-8 w-8 text-amber-100" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Install BuildPilot App
            </p>
            <p className="mt-1 text-sm leading-6 text-stone-200 sm:text-base">
              {isAndroid
                ? "Add BuildPilot to your home screen for quick access."
                : "Access projects and measurements directly from your home screen!"}
            </p>

            {showInstructions ? (
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/10 p-3 text-left text-sm text-stone-100">
                <p className="mb-2 font-semibold text-white">
                  {isAndroid
                    ? "How to install on Android"
                    : "How to install on iPhone / iPad"}
                </p>

                {isAndroid ? (
                  <ol className="list-decimal space-y-1 pl-5 text-stone-200">
                    <li>Open this page in Chrome.</li>
                    <li>Tap the menu button in the top-right.</li>
                    <li>Select “Install app” or “Add to Home screen”.</li>
                    <li>Tap “Install” to finish.</li>
                  </ol>
                ) : (
                  <ol className="list-decimal space-y-1 pl-5 text-stone-200">
                    <li>Tap the Share button at the bottom of Safari.</li>
                    <li>Select “Add to Home Screen”.</li>
                    <li>Tap “Add” in the top-right corner.</li>
                  </ol>
                )}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={handleInstall}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f3d77a] px-5 py-3 text-base font-bold text-stone-900 shadow-sm transition hover:bg-[#efcd5e]"
            >
              <Download className="h-5 w-5" />
              Install
            </button>

            <button
              type="button"
              aria-label="Close install prompt"
              onClick={() => setIsVisible(false)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
