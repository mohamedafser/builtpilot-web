"use client";

import { useTourHighlight } from "@/components/onboarding/tour-highlight-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

type TourStep = {
  title: string;
  description: string;
  target?: string;
  placement?: "top" | "bottom" | "left" | "right";
};

const steps: TourStep[] = [
  {
    title: "Welcome to BuildPilot",
    description:
      "This quick walkthrough shows where to find the main areas of your workspace. You can skip it anytime.",
  },
  {
    title: "Start on the dashboard",
    description:
      "Review project health, recent activity, and the next actions that need attention from your home screen.",
    target: "nav-dashboard",
    placement: "right",
  },
  {
    title: "Manage your projects",
    description:
      "Open Projects to track status, budgets, site progress, and the tasks that keep each job moving.",
    target: "nav-projects",
    placement: "right",
  },
  {
    title: "Ask BuildPilot AI",
    description:
      "Use AI from the sidebar or the floating button for progress updates, costs, materials, and next steps.",
    target: "nav-ai",
    placement: "right",
  },
  {
    title: "Choose your language",
    description:
      "Switch between English, Tamil, Arabic, and Hindi from the header or mobile top bar. Your choice is saved to your profile.",
    target: "language-switcher",
    placement: "bottom",
  },
  {
    title: "Configure your workspace",
    description:
      "Open Settings to manage your organization, invite teammates, and update workspace preferences.",
    target: "nav-settings",
    placement: "right",
  },
  {
    title: "You are ready to go",
    description:
      "Create your first project, explore daily reports, and invite your team when you are ready to collaborate.",
  },
];

function tourStorageKey(userId: string) {
  return `buildpilot_tour_completed_${userId}`;
}

function findVisibleTourTarget(tourId: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(
    `[data-tour="${tourId}"]`,
  );

  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return node;
    }
  }

  return null;
}

function getTooltipStyle(
  rect: DOMRect | null,
  placement: TourStep["placement"],
): CSSProperties {
  if (!rect) {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      maxWidth: "min(24rem, calc(100vw - 2rem))",
    };
  }

  const gap = 14;
  const maxWidth = "min(22rem, calc(100vw - 2rem))";

  switch (placement) {
    case "left":
      return {
        top: rect.top + rect.height / 2,
        left: rect.left - gap,
        transform: "translate(-100%, -50%)",
        maxWidth,
      };
    case "top":
      return {
        top: rect.top - gap,
        left: rect.left + rect.width / 2,
        transform: "translate(-50%, -100%)",
        maxWidth,
      };
    case "bottom":
      return {
        top: rect.bottom + gap,
        left: rect.left + rect.width / 2,
        transform: "translate(-50%, 0)",
        maxWidth,
      };
    case "right":
    default:
      return {
        top: rect.top + rect.height / 2,
        left: rect.right + gap,
        transform: "translateY(-50%)",
        maxWidth,
      };
  }
}

export function AppTour({ userId }: { userId?: string }) {
  const { setActiveTarget } = useTourHighlight();
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const current = useMemo(() => steps[currentStep], [currentStep]);
  const isCentered = !current.target;

  const measureTarget = useCallback(() => {
    if (!current.target) {
      setTargetRect(null);
      return null;
    }

    const element = findVisibleTourTarget(current.target);
    if (!element) {
      setTargetRect(null);
      return null;
    }

    element.scrollIntoView({ block: "nearest", behavior: "smooth" });
    setTargetRect(element.getBoundingClientRect());
    return element;
  }, [current.target]);

  useEffect(() => {
    setIsMounted(true);

    if (!userId) {
      return;
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const isWelcome = params.get("welcome") === "1";
      const completed =
        window.localStorage.getItem(tourStorageKey(userId)) === "1";

      if (!completed || isWelcome) {
        setIsVisible(true);
      }

      if (isWelcome) {
        const url = new URL(window.location.href);
        url.searchParams.delete("welcome");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    } catch {
      setIsVisible(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!isMounted || !isVisible) {
      setActiveTarget(null);
      return;
    }

    setActiveTarget(current.target ?? null);
  }, [isMounted, isVisible, current.target, setActiveTarget]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    let cancelled = false;
    let observer: ResizeObserver | null = null;

    const runMeasure = () => {
      if (cancelled) {
        return;
      }

      const element = measureTarget();
      observer?.disconnect();

      if (element) {
        observer = new ResizeObserver(() => {
          if (!cancelled) {
            setTargetRect(element.getBoundingClientRect());
          }
        });
        observer.observe(element);
      }
    };

    runMeasure();
    const rafId = requestAnimationFrame(runMeasure);
    const afterSidebar = window.setTimeout(runMeasure, 280);
    const afterScroll = window.setTimeout(runMeasure, 520);

    const onLayoutChange = () => {
      runMeasure();
    };

    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("scroll", onLayoutChange, true);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(afterSidebar);
      window.clearTimeout(afterScroll);
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("scroll", onLayoutChange, true);
      observer?.disconnect();
    };
  }, [isVisible, currentStep, measureTarget]);

  if (!isMounted || !isVisible || !userId) {
    return null;
  }

  const finishTour = () => {
    setActiveTarget(null);
    try {
      window.localStorage.setItem(tourStorageKey(userId), "1");
    } catch {
      // Ignore storage errors; first-run guidance is non-critical.
    }
    setIsVisible(false);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((value) => value + 1);
      return;
    }

    finishTour();
  };

  const highlightStyle = targetRect
    ? {
        top: targetRect.top - 6,
        left: targetRect.left - 6,
        width: targetRect.width + 12,
        height: targetRect.height + 12,
      }
    : null;

  return (
    <div className="fixed inset-0 z-[100]" role="presentation">
      {highlightStyle ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-4 ring-amber-400/90 transition-all duration-300 ease-out"
          style={{
            ...highlightStyle,
            boxShadow: "0 0 0 9999px rgba(28, 25, 23, 0.62)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-[1px]" />
      )}

      <div
        className={cn(
          "absolute z-[101] w-full rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl transition-all duration-300 ease-out sm:p-6",
          isCentered ? "max-w-lg px-4" : "",
        )}
        style={getTooltipStyle(targetRect, current.placement)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-tour-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold tracking-[0.18em] text-amber-700 uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            Step {currentStep + 1} of {steps.length}
          </div>
          <button
            type="button"
            onClick={finishTour}
            className="rounded-md p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Skip walkthrough"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">
          <div className="mb-4 flex items-center gap-2">
            {steps.map((_, index) => (
              <span
                key={index}
                className={cn(
                  "h-2 rounded-full transition-all",
                  index === currentStep
                    ? "w-7 bg-amber-600"
                    : "w-2 bg-stone-200",
                )}
              />
            ))}
          </div>

          <h2
            id="app-tour-title"
            className="text-xl font-semibold text-stone-900 sm:text-2xl"
          >
            {current.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            {current.description}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={finishTour}
            className="text-sm font-medium text-stone-500 hover:text-stone-800"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentStep((value) => value - 1)}
              >
                Back
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={nextStep}
              icon={currentStep === steps.length - 1 ? Check : ArrowRight}
            >
              {currentStep === steps.length - 1 ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
