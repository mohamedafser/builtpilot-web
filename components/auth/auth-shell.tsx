import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";
import { Bricolage_Grotesque } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-auth-display",
});

const highlights = [
  "Projects, labour, materials, and cost in one workspace",
  "Quotations, BOQ, and estimate vs actual",
  "Client portal, WhatsApp updates, and BuildPilot AI",
];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        display.variable,
        "relative min-h-screen overflow-hidden bg-stone-100 text-stone-900",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_0%_0%,rgba(217,119,6,0.18)_0%,transparent_45%),radial-gradient(70%_60%_at_100%_10%,rgba(168,162,158,0.25)_0%,transparent_50%),linear-gradient(180deg,#fafaf9_0%,#f5f5f4_100%)]"
      />
      <div
        aria-hidden
        className="landing-hero-grid pointer-events-none absolute inset-0 opacity-40"
      />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden px-10 py-10 text-stone-100 lg:flex">
          <div
            aria-hidden
            className="absolute inset-4 rounded-3xl bg-stone-950"
          />
          <div
            aria-hidden
            className="absolute inset-4 rounded-3xl bg-[radial-gradient(80%_60%_at_20%_0%,rgba(217,119,6,0.35)_0%,transparent_55%),linear-gradient(160deg,rgba(41,37,36,0.2)_0%,transparent_50%)]"
          />
          <div
            aria-hidden
            className="landing-hero-grid absolute inset-4 rounded-3xl opacity-30"
          />

          <div className="relative z-10">
            <Logo href="/" light />
          </div>

          <div className="relative z-10 max-w-md">
            <p
              className={cn(
                "font-[family-name:var(--font-auth-display)] text-4xl leading-tight font-semibold tracking-tight text-white xl:text-5xl",
              )}
            >
              Run every job from site to client handoff.
            </p>
            <p className="mt-4 text-base leading-7 text-stone-300">
              BuildPilot helps civil engineers and small contractors track work,
              cost, and client updates—built for India and the UAE.
            </p>
            <ul className="mt-8 space-y-3">
              {highlights.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm leading-6 text-stone-200"
                >
                  <span
                    aria-hidden
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative z-10 text-sm text-stone-400">
            © {new Date().getFullYear()} BuildPilot
          </p>
        </aside>

        <section className="flex flex-col px-4 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Logo href="/" />
            <Link
              href="/"
              className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
            >
              Home
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div className="landing-fade-up w-full max-w-md">{children}</div>
          </div>

          <p className="mt-8 text-center text-xs text-stone-500 lg:text-left">
            Secure workspace for construction teams.
          </p>
        </section>
      </div>
    </div>
  );
}
