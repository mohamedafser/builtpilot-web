import {
  Building2,
  ClipboardList,
  FileText,
  Package,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const orbitIcons = [
  {
    icon: Building2,
    label: "Projects",
    className: "landing-orbit-1 left-[8%] top-[12%]",
  },
  {
    icon: ClipboardList,
    label: "BOQ",
    className: "landing-orbit-2 right-[6%] top-[18%]",
  },
  {
    icon: Package,
    label: "Materials",
    className: "landing-orbit-3 left-[4%] bottom-[22%]",
  },
  {
    icon: FileText,
    label: "Quotations",
    className: "landing-orbit-4 right-[10%] bottom-[16%]",
  },
];

export function AnimatedShowcase() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      <div className="landing-showcase-glow absolute inset-8 rounded-full bg-amber-300/25 blur-3xl" />

      <div className="landing-showcase-ring absolute inset-6 rounded-[2rem] border border-dashed border-amber-300/40" />
      <div className="landing-showcase-ring landing-showcase-ring-reverse absolute inset-12 rounded-[1.75rem] border border-stone-300/50" />

      {orbitIcons.map(({ icon: Icon, label, className }) => (
        <div
          key={label}
          className={cn(
            "landing-orbit-icon absolute flex flex-col items-center gap-1.5",
            className,
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-stone-200 bg-white text-amber-700 shadow-[0_16px_40px_-24px_rgba(28,25,23,0.45)] sm:h-14 sm:w-14">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-stone-600 uppercase ring-1 ring-stone-200/80">
            {label}
          </span>
        </div>
      ))}

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="landing-showcase-core relative w-[min(72%,14rem)] overflow-hidden rounded-[1.75rem] border border-stone-200/80 bg-white p-5 shadow-[0_28px_60px_-28px_rgba(28,25,23,0.45)] sm:p-6">
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-amber-50 to-transparent" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-[0_12px_24px_-12px_rgba(234,88,12,0.65)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.16em] text-stone-500 uppercase">
                BuildPilot
              </p>
              <p className="text-base font-semibold text-stone-900">
                Project workspace
              </p>
            </div>
          </div>

          <div className="relative mt-5 space-y-2.5">
            {[
              { label: "Active projects", value: "12" },
              { label: "Pending tasks", value: "08" },
              { label: "Cost alerts", value: "03" },
            ].map((item, index) => (
              <div
                key={item.label}
                className={cn(
                  "landing-showcase-stat flex items-center justify-between rounded-xl border border-stone-200/80 bg-stone-50/80 px-3 py-2.5",
                  index === 1 && "landing-showcase-stat-delay-1",
                  index === 2 && "landing-showcase-stat-delay-2",
                )}
              >
                <span className="text-xs text-stone-600">{item.label}</span>
                <span className="text-sm font-bold text-stone-900">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
