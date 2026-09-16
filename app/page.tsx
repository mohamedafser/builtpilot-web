import { AnimatedShowcase } from "@/components/landing/animated-showcase";
import { Logo } from "@/components/layout/logo";
import { PwaInstallBanner } from "@/components/pwa/install-banner";
import { linkButtonClassName } from "@/components/ui/button";
import { WithIcon } from "@/components/ui/with-icon";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileText,
  KeyRound,
  LogIn,
  MonitorSmartphone,
  Package,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Bricolage_Grotesque } from "next/font/google";
import Link from "next/link";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-landing-display",
});

const featureCards = [
  {
    title: "Projects",
    description: "Plan jobs, budgets, and daily site progress in one place.",
    icon: Building2,
  },
  {
    title: "BOQ & estimates",
    description: "Manage quantities, rates, measurements, and cost breakdowns.",
    icon: ClipboardList,
  },
  {
    title: "Materials",
    description: "Track stock received, used, and remaining on every site.",
    icon: Package,
  },
  {
    title: "Quotations",
    description: "Compare supplier pricing and move faster on procurement.",
    icon: FileText,
  },
  {
    title: "Tasks & labour",
    description: "Assign work, track attendance, and keep deadlines visible.",
    icon: CheckCircle2,
  },
  {
    title: "Cost control",
    description: "Monitor estimated vs actual spend before overruns grow.",
    icon: CircleDollarSign,
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Set up the project",
    description: "Create the job, team, and baseline budget.",
  },
  {
    step: "02",
    title: "Plan BOQ & quotes",
    description: "Define materials, compare suppliers, and lock estimates.",
  },
  {
    step: "03",
    title: "Run the site",
    description: "Log labour, materials, expenses, and daily reports.",
  },
  {
    step: "04",
    title: "Stay in control",
    description: "Use AI insights to spot delays, shortages, and cost drift.",
  },
];

const trustPoints = [
  {
    title: "OTP verification",
    description: "Secure signup and password reset with 6-digit email codes.",
    icon: KeyRound,
  },
  {
    title: "Install anywhere",
    description: "Use BuildPilot as a PWA on desktop, Android, or iOS.",
    icon: MonitorSmartphone,
  },
  {
    title: "Protected access",
    description: "Encrypted sessions with role-based project permissions.",
    icon: ShieldCheck,
  },
];

export default function HomePage() {
  return (
    <div
      className={cn(
        display.variable,
        "min-h-screen bg-stone-50 text-stone-900",
      )}
    >
      <PwaInstallBanner />

      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className={linkButtonClassName("ghost", "md")}>
            <WithIcon icon={LogIn}>Sign in</WithIcon>
          </Link>
          <Link href="/signup" className={linkButtonClassName("primary", "md")}>
            <WithIcon icon={ArrowRight}>Get started</WithIcon>
          </Link>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(100%_70%_at_10%_0%,rgba(251,191,36,0.18)_0%,transparent_50%),linear-gradient(180deg,#fafaf9_0%,#f5f5f4_100%)]"
          />
          <div
            aria-hidden
            className="landing-hero-grid landing-fade-in absolute inset-0 opacity-60"
          />

          <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-12 lg:py-20">
            <div className="landing-fade-up">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-amber-800 uppercase">
                <Sparkles className="h-3.5 w-3.5" />
                Construction management
              </div>

              <h1
                className={cn(
                  "font-[family-name:var(--font-landing-display)] text-4xl leading-tight font-semibold tracking-tight text-stone-950 sm:text-5xl lg:text-6xl",
                )}
              >
                Run every construction project with clarity
              </h1>

              <p className="mt-4 max-w-xl text-base leading-7 text-stone-600 sm:text-lg">
                BuildPilot brings projects, BOQ, materials, quotations, labour,
                and costs into one workspace—with AI insights when you need the
                next move.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/signup"
                  className={cn(
                    linkButtonClassName("primary", "lg"),
                    "transition-transform duration-200 hover:-translate-y-0.5",
                  )}
                >
                  <WithIcon icon={ArrowRight}>Start free</WithIcon>
                </Link>
                <Link
                  href="/login"
                  className={linkButtonClassName("secondary", "lg")}
                >
                  <WithIcon icon={LogIn}>Sign in</WithIcon>
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {["India & UAE", "INR / AED", "PWA ready", "OTP secure"].map(
                  (badge) => (
                    <span
                      key={badge}
                      className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600"
                    >
                      {badge}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="landing-fade-up landing-fade-up-delay-1">
              <AnimatedShowcase />
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-stone-200 bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.18em] text-amber-700 uppercase">
                Platform
              </p>
              <h2
                className={cn(
                  "mt-2 font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl",
                )}
              >
                Everything your site team needs
              </h2>
              <p className="mt-3 text-base leading-7 text-stone-600">
                One professional workspace for civil engineers and contractors—no
                spreadsheets, no scattered tools.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featureCards.map(({ title, description, icon: Icon }, index) => (
                <div
                  key={title}
                  className="group rounded-2xl border border-stone-200 bg-stone-50/50 p-5 transition duration-200 hover:-translate-y-1 hover:border-amber-200 hover:bg-white hover:shadow-[0_18px_40px_-28px_rgba(28,25,23,0.35)]"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <div className="landing-feature-icon mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 ring-1 ring-amber-200/60">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-stone-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="border-t border-stone-200 bg-stone-50">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.18em] text-amber-700 uppercase">
                Workflow
              </p>
              <h2
                className={cn(
                  "mt-2 font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl",
                )}
              >
                From plan to progress
              </h2>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {workflowSteps.map(({ step, title, description }) => (
                <div
                  key={step}
                  className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-xs font-bold text-amber-800">
                    {step}
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-stone-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="ai" className="border-t border-stone-200 bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-amber-700 uppercase">
                  BuildPilot AI
                </p>
                <h2
                  className={cn(
                    "mt-2 font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl",
                  )}
                >
                  Know what needs attention next
                </h2>
                <p className="mt-3 text-base leading-7 text-stone-600">
                  Ask about pending materials, quotations, tasks, and cost
                  alerts using live project data—not generic chat responses.
                </p>
              </div>

              <div className="landing-ai-panel rounded-2xl border border-stone-200 bg-[#171412] p-5 text-stone-50 shadow-[0_24px_60px_-28px_rgba(28,25,23,0.55)]">
                <div className="flex items-center gap-2 border-b border-white/10 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-stone-950">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.16em] text-stone-400 uppercase">
                      BuildPilot AI
                    </p>
                    <p className="text-sm font-medium text-white">
                      Project copilot
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="landing-ai-message landing-ai-message-user rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                    What needs my attention today?
                  </div>
                  <div className="landing-ai-message landing-ai-message-ai rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-stone-100">
                    3 material deliveries pending, 1 quotation to review, and 2
                    tasks due today.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="trust" className="border-t border-stone-200 bg-stone-50">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.18em] text-amber-700 uppercase">
                Security & access
              </p>
              <h2
                className={cn(
                  "mt-2 font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl",
                )}
              >
                Built for professional teams
              </h2>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {trustPoints.map(({ title, description, icon: Icon }) => (
                <div
                  key={title}
                  className="flex gap-4 rounded-2xl border border-stone-200 bg-white p-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-stone-600">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-stone-200 bg-white">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:px-6 sm:py-16 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2
                className={cn(
                  "font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl",
                )}
              >
                Start your construction workspace
              </h2>
              <p className="mt-3 text-base leading-7 text-stone-600">
                Sign up in minutes. Choose India or UAE, install the PWA on any
                device, and manage projects from office or site.
              </p>
            </div>
            <Link
              href="/signup"
              className={cn(
                linkButtonClassName("primary", "lg"),
                "shrink-0 transition-transform duration-200 hover:-translate-y-0.5",
              )}
            >
              <WithIcon icon={Sparkles}>Create your workspace</WithIcon>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-stone-100">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} BuildPilot</p>
          <p>Construction management for civil engineers and contractors.</p>
        </div>
      </footer>
    </div>
  );
}
