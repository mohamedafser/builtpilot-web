"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "buildpilot_app_tour_completed";

const steps = [
  {
    title: "Welcome to BuildPilot",
    description:
      "Start from the dashboard to review project health, recent activity, and the next actions that need attention.",
  },
  {
    title: "Manage projects",
    description:
      "Open the Projects area to track status, budgets, site progress, and the tasks that keep each job moving.",
  },
  {
    title: "Use BuildPilot AI",
    description:
      "Ask the AI for progress, costs, material updates, quotations, and next steps with the project context already in view.",
  },
  {
    title: "Keep work moving",
    description:
      "Use reports, BOQ, materials, and vendor workflows to coordinate the site and keep information current for the whole team.",
  },
] as const;

export function AppTour() {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    setIsMounted(true);

    try {
      const completed = window.localStorage.getItem(STORAGE_KEY) === "1";
      if (!completed) {
        setIsVisible(true);
      }
    } catch {
      setIsVisible(false);
    }
  }, []);

  const current = useMemo(() => steps[currentStep], [currentStep]);

  if (!isMounted || !isVisible) {
    return null;
  }

  const finishTour = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignore storage errors; on first-run guidance is non-critical.
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/55 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold tracking-[0.18em] text-amber-700 uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            Tour
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

        <div className="mt-5">
          <div className="mb-4 flex items-center gap-2">
            {steps.map((_, index) => (
              <span
                key={index}
                className={cn(
                  "h-2.5 rounded-full transition-all",
                  index === currentStep
                    ? "w-8 bg-amber-600"
                    : "w-2.5 bg-stone-200",
                )}
              />
            ))}
          </div>

          <h2 className="text-2xl font-semibold text-stone-900">
            {current.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            {current.description}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={finishTour}
            className="text-sm font-medium text-stone-500 hover:text-stone-800"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={finishTour}>
              Done
            </Button>
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
