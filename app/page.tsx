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
  LogIn,
  Package,
  Sparkles,
} from "lucide-react";
import { Bricolage_Grotesque } from "next/font/google";
import Link from "next/link";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-landing-display",
});

const aiHighlights = [
  {
    title: "AI Project Insights",
    description: "Actionable updates",
  },
  {
    title: "Smart BOQ Analysis",
    description: "Budget clarity",
  },
  {
    title: "Material Intelligence",
    description: "Procurement alerts",
  },
  {
    title: "Project Alerts",
    description: "Priority tracking",
  },
];

const featureCards = [
  {
    title: "Projects",
    description: "Plan and track every construction project.",
    icon: Building2,
  },
  {
    title: "BOQ",
    description: "Define materials, quantities, rates, and estimated costs.",
    icon: ClipboardList,
  },
  {
    title: "Materials",
    description: "Track received, used, and remaining materials.",
    icon: Package,
  },
  {
    title: "Quotations",
    description: "Compare supplier pricing and make better decisions.",
    icon: FileText,
  },
  {
    title: "Tasks",
    description: "Keep project activities and deadlines organized.",
    icon: CheckCircle2,
  },
  {
    title: "Costs",
    description: "Monitor estimated vs actual project spending.",
    icon: CircleDollarSign,
  },
];

const workflowSteps = [
  { title: "Project", description: "Set up the job and stakeholders." },
  { title: "BOQ", description: "Plan materials, rates, and quantities." },
  { title: "Quotation", description: "Compare suppliers and cost options." },
  { title: "Procurement", description: "Track purchase and delivery status." },
  { title: "Materials", description: "Log usage and remaining inventory." },
  { title: "Tasks", description: "Assign actions and deadlines." },
  { title: "Progress", description: "See the job move forward with clarity." },
];

const smartInsights = [
  {
    kind: "warning",
    title: "Material Shortage",
    text: "Cement requirement is higher than current stock.",
  },
  {
    kind: "info",
    title: "Cost Alert",
    text: "Project spending is 8% above estimated cost.",
  },
  {
    kind: "success",
    title: "Quotation",
    text: "2 supplier quotations are ready for comparison.",
  },
  {
    kind: "info",
    title: "Task",
    text: "3 project tasks are due this week.",
  },
];

const capabilities = [
  {
    title: "Projects & site diary",
    description:
      "Track jobs, budgets, and progress. Log daily reports with manpower, materials, and site photos.",
  },
  {
    title: "Labour & attendance",
    description:
      "Assign workers, mark daily attendance, and see labour cost roll up by project.",
  },
  {
    title: "Materials & vendors",
    description:
      "Catalog stock, receive and use materials, and keep vendor records tied to each job.",
  },
  {
    title: "Expenses & cost control",
    description:
      "Record project expenses with receipts and watch actual spend against estimates.",
  },
  {
    title: "Quotations & BOQ",
    description:
      "Send quotations, compare estimate vs actual, and manage BOQ sections, items, and measurements.",
  },
];

/** Distinctive features BuildPilot introduced vs typical competitor tools. */
const newVsCompetitors = [
  {
    feature: "BuildPilot AI",
    competitors:
      "Generic chatbots or no AI. Answers are not tied to your live job data.",
    ours: "Ask about costs, attendance, progress, and site activity from your authorized projects.",
  },
  {
    feature: "WhatsApp client updates",
    competitors:
      "Email-only or separate WhatsApp apps with no link to the job record.",
    ours: "Send client updates and portal links from the project, with message history and notifications.",
  },
  {
    feature: "Client portal link",
    competitors: "Clients wait for PDFs, photo dumps, and status calls.",
    ours: "One secure link for progress, photos, cost, quotation, BOQ, and daily reports.",
  },
  {
    feature: "Estimate vs actual",
    competitors:
      "Quotation, BOQ, labour, and expenses live in different tools—no single comparison.",
    ours: "Quotations, BOQ progress, labour, and expenses stay connected so overruns show early.",
  },
  {
    feature: "BOQ with measurements",
    competitors:
      "Static BOQ sheets without measurement history or completed-value tracking.",
    ours: "Sections, items, measurement logs, and completed vs remaining value on every job.",
  },
  {
    feature: "Daily site diary",
    competitors:
      "Paper diaries or chat threads that never become searchable project history.",
    ours: "Daily reports with manpower, materials used, and private site photos in the project.",
  },
  {
    feature: "India & UAE locale",
    competitors:
      "USD/EUR defaults, English-only, and workflows built for Western offices.",
    ours: "Country sets INR or AED. Languages: English, தமிழ், العربية, हिन्दी.",
  },
  {
    feature: "Built for small site teams",
    competitors:
      "Enterprise suites that take months to roll out, or spreadsheets that do not scale.",
    ours: "One workspace for civil engineers and small contractors—ready the day you sign up.",
  },
];

export default function HomePage() {
  return (
    <div
      className={cn(
        display.variable,
        "min-h-screen bg-stone-100 text-stone-900",
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
        <section className="relative isolate min-h-[calc(100vh-4.5rem)] overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(120%_80%_at_12%_0%,rgba(217,119,6,0.28)_0%,transparent_42%),radial-gradient(90%_70%_at_88%_18%,rgba(168,162,158,0.35)_0%,transparent_48%),linear-gradient(180deg,#fafaf9_0%,#f5f5f4_58%,#e7e5e4_100%)]"
          />
          <div
            aria-hidden
            className="landing-hero-grid landing-fade-in absolute inset-0 opacity-70"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-stone-100 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] lg:block"
          >
            <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(180,83,9,0.12)_38%,rgba(28,25,23,0.18)_100%)]" />
            <svg
              className="absolute inset-0 h-full w-full opacity-40"
              viewBox="0 0 600 800"
              fill="none"
              aria-hidden
            >
              <path
                d="M80 720V220l220-120 220 120v500"
                stroke="#1c1917"
                strokeWidth="1.5"
                opacity="0.35"
              />
              <path
                d="M160 720V300h280v420"
                stroke="#1c1917"
                strokeWidth="1.25"
                opacity="0.28"
              />
              <path
                d="M160 420h280M160 520h280M240 300v420M360 300v420"
                stroke="#1c1917"
                strokeWidth="1"
                opacity="0.2"
              />
              <circle
                cx="300"
                cy="180"
                r="54"
                stroke="#b45309"
                strokeWidth="2"
              />
            </svg>
          </div>

          <div className="relative z-10 mx-auto grid min-h-[calc(100vh-4.5rem)] w-full max-w-6xl items-center gap-8 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10">
            <div className="landing-fade-up">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-white/80 px-3 py-1.5 text-[11px] font-semibold tracking-[0.18em] text-amber-800 uppercase shadow-sm backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                BuildPilot AI
              </div>

              <p
                className={cn(
                  "font-[family-name:var(--font-landing-display)] text-5xl leading-none font-semibold tracking-tight text-stone-950 sm:text-6xl lg:text-7xl",
                )}
              >
                BuildPilot
              </p>

              <h1 className="mt-5 max-w-xl text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl lg:text-4xl">
                Your AI Copilot for Smarter Construction
              </h1>

              <p className="mt-4 max-w-xl text-base leading-7 text-stone-600 sm:text-lg">
                BuildPilot AI helps construction teams understand projects,
                BOQs, materials, quotations, costs, and pending actions—so the
                next move is always clear.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/signup"
                  className={cn(
                    linkButtonClassName("primary", "lg"),
                    "transition-transform duration-200 hover:-translate-y-0.5",
                  )}
                >
                  <WithIcon icon={Sparkles}>Explore BuildPilot AI</WithIcon>
                </Link>
                <Link
                  href="/login"
                  className={cn(
                    linkButtonClassName("secondary", "lg"),
                    "border-stone-400/70 bg-white/70 backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5",
                  )}
                >
                  <WithIcon icon={LogIn}>Sign in</WithIcon>
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {aiHighlights.map((item) => (
                  <div
                    key={item.title}
                    className="landing-ai-highlight rounded-2xl border border-stone-200/80 bg-white/70 p-3 shadow-[0_18px_40px_-24px_rgba(28,25,23,0.35)] backdrop-blur-sm"
                  >
                    <p className="text-sm font-semibold text-stone-900">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[11px] font-medium tracking-[0.12em] text-stone-500 uppercase">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="landing-fade-up landing-fade-up-delay-1 relative">
              <div className="landing-ai-glow absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-amber-200/45 via-white/10 to-stone-200/60 blur-3xl" />

              <div className="landing-ai-panel relative overflow-hidden rounded-[2rem] border border-stone-200/70 bg-[#171412]/95 p-4 text-stone-50 shadow-[0_32px_70px_-30px_rgba(38,24,14,0.7)] sm:p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-stone-950 shadow-[0_12px_20px_-10px_rgba(251,146,60,0.7)]">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold tracking-[0.18em] text-stone-300 uppercase">
                        BuildPilot AI
                      </p>
                      <p className="text-sm font-medium text-white">
                        Project Copilot
                      </p>
                    </div>
                  </div>
                  <div className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold tracking-[0.14em] text-emerald-300 uppercase">
                    online
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="landing-ai-message landing-ai-message-user rounded-2xl rounded-br-md border border-white/10 bg-white/5 p-3 text-sm text-stone-100">
                    <p className="text-[10px] font-semibold tracking-[0.14em] text-stone-400 uppercase">
                      User
                    </p>
                    <p className="mt-2 leading-6">
                      “What needs my attention today?”
                    </p>
                  </div>

                  <div className="landing-ai-message landing-ai-message-ai rounded-2xl rounded-bl-md border border-amber-400/20 bg-gradient-to-br from-amber-500/15 to-white/5 p-3 text-sm text-stone-100">
                    <p className="text-[10px] font-semibold tracking-[0.14em] text-amber-200 uppercase">
                      BuildPilot AI
                    </p>
                    <p className="mt-2 leading-6 text-stone-100">
                      “You have 3 pending material deliveries, 1 quotation
                      awaiting review, and 2 project tasks due today.”
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="landing-ai-card rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] font-semibold tracking-[0.14em] text-stone-400 uppercase">
                      Materials Pending
                    </p>
                    <p className="mt-2 text-2xl font-bold text-white">03</p>
                  </div>
                  <div className="landing-ai-card rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] font-semibold tracking-[0.14em] text-stone-400 uppercase">
                      Quotation Review
                    </p>
                    <p className="mt-2 text-2xl font-bold text-white">01</p>
                  </div>
                  <div className="landing-ai-card rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] font-semibold tracking-[0.14em] text-stone-400 uppercase">
                      Tasks Due
                    </p>
                    <p className="mt-2 text-2xl font-bold text-white">02</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="ai-copilot"
          className="border-t border-stone-200 bg-white/70"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold tracking-[0.18em] text-amber-700 uppercase">
                  BuildPilot AI
                </p>
                <h2
                  className={cn(
                    "mt-3 font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl",
                  )}
                >
                  Meet Your Construction Copilot
                </h2>
              </div>
              <p className="max-w-xl text-base leading-7 text-stone-600">
                Get instant insights from your project data and know what needs
                your attention next.
              </p>
            </div>

            <div className="landing-ai-panel relative mt-10 overflow-hidden rounded-[2rem] border border-amber-200/60 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_35%),linear-gradient(180deg,#fffdfb_0%,#f7f5f3_100%)] p-4 shadow-[0_24px_60px_-32px_rgba(120,53,15,0.4)] sm:p-6">
              <div className="absolute inset-x-16 top-0 h-28 rounded-full bg-amber-300/20 blur-3xl" />

              <div className="relative grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-stone-200 bg-white/80 p-4 shadow-sm">
                    <p className="text-[10px] font-semibold tracking-[0.18em] text-stone-500 uppercase">
                      User
                    </p>
                    <p className="mt-3 text-lg font-medium text-stone-800">
                      “What needs my attention today?”
                    </p>
                  </div>

                  <div className="landing-ai-response rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-[0_12px_30px_-20px_rgba(234,88,12,0.5)]">
                    <p className="text-[10px] font-semibold tracking-[0.18em] text-amber-700 uppercase">
                      BuildPilot AI
                    </p>
                    <p className="mt-3 text-base leading-7 text-stone-700">
                      “You have 3 pending material deliveries, 1 quotation
                      awaiting review, and 2 tasks due today.”
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="landing-floating-card rounded-2xl border border-stone-200 bg-white/80 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-amber-700">
                      <Package className="h-4 w-4" />
                      <span className="text-[10px] font-semibold tracking-[0.14em] uppercase">
                        Materials
                      </span>
                    </div>
                    <p className="mt-3 text-3xl font-black text-stone-900">3</p>
                    <p className="text-xs tracking-[0.12em] text-stone-500 uppercase">
                      Pending
                    </p>
                  </div>

                  <div className="landing-floating-card rounded-2xl border border-stone-200 bg-white/80 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-orange-700">
                      <FileText className="h-4 w-4" />
                      <span className="text-[10px] font-semibold tracking-[0.14em] uppercase">
                        Quotations
                      </span>
                    </div>
                    <p className="mt-3 text-3xl font-black text-stone-900">1</p>
                    <p className="text-xs tracking-[0.12em] text-stone-500 uppercase">
                      Review
                    </p>
                  </div>

                  <div className="landing-floating-card rounded-2xl border border-stone-200 bg-white/80 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-[10px] font-semibold tracking-[0.14em] uppercase">
                        Tasks
                      </span>
                    </div>
                    <p className="mt-3 text-3xl font-black text-stone-900">2</p>
                    <p className="text-xs tracking-[0.12em] text-stone-500 uppercase">
                      Due today
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-stone-200 bg-stone-100">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.18em] text-amber-700 uppercase">
                Core modules
              </p>
              <h2
                className={cn(
                  "mt-3 font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl",
                )}
              >
                One workspace for every stage of the project.
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {featureCards.map(({ title, description, icon: Icon }) => (
                <div
                  key={title}
                  className="landing-feature-card group rounded-[1.7rem] border border-stone-200 bg-white/90 p-5 shadow-[0_18px_30px_-24px_rgba(0,0,0,0.35)] transition-all duration-200 hover:-translate-y-1 hover:border-amber-200"
                >
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 transition-transform duration-200 group-hover:scale-105">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-stone-900">
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

        <section className="border-t border-stone-200 bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.18em] text-amber-700 uppercase">
                Workflow
              </p>
              <h2
                className={cn(
                  "mt-3 font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl",
                )}
              >
                From planning to progress, everything stays connected.
              </h2>
            </div>

            <div className="landing-workflow relative grid gap-4 md:grid-cols-2 xl:grid-cols-7">
              {workflowSteps.map(({ title, description }, index) => (
                <div key={title} className="relative">
                  <div className="landing-workflow-step h-full rounded-[1.4rem] border border-stone-200 bg-stone-50 p-4 text-left shadow-[0_16px_30px_-28px_rgba(0,0,0,0.5)]">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                      {index + 1}
                    </div>
                    <h3 className="text-base font-semibold text-stone-900">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-stone-200 bg-stone-100">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.18em] text-amber-700 uppercase">
                Smart insights
              </p>
              <h2
                className={cn(
                  "mt-3 font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl",
                )}
              >
                Stay ahead of what matters most.
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {smartInsights.map(({ kind, title, text }) => (
                <div
                  key={title}
                  className={cn(
                    "rounded-[1.5rem] border p-4 shadow-[0_18px_30px_-26px_rgba(0,0,0,0.45)]",
                    kind === "warning" && "border-amber-200 bg-amber-50/80",
                    kind === "info" && "border-stone-200 bg-white",
                    kind === "success" && "border-emerald-200 bg-emerald-50/80",
                  )}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-full",
                        kind === "warning" && "bg-amber-100 text-amber-700",
                        kind === "info" && "bg-stone-200 text-stone-700",
                        kind === "success" && "bg-emerald-100 text-emerald-700",
                      )}
                    >
                      {kind === "warning"
                        ? "!"
                        : kind === "success"
                          ? "✓"
                          : "i"}
                    </span>
                    <span className="text-[10px] font-semibold tracking-[0.14em] text-stone-500 uppercase">
                      {kind}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-stone-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-stone-200 bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="rounded-[2rem] border border-stone-200 bg-gradient-to-br from-white via-stone-50 to-amber-50/60 p-6 shadow-[0_18px_48px_-28px_rgba(28,25,23,0.5)] sm:p-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold tracking-[0.18em] text-amber-700 uppercase">
                    Why BuildPilot
                  </p>
                  <h2
                    className={cn(
                      "mt-3 font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl",
                    )}
                  >
                    Everything your construction team needs. One workspace.
                  </h2>
                </div>

                <Link
                  href="/signup"
                  className={cn(
                    linkButtonClassName("primary", "lg"),
                    "shrink-0 transition-transform duration-200 hover:-translate-y-0.5",
                  )}
                >
                  <WithIcon icon={ArrowRight}>Get Started</WithIcon>
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  "Project Management",
                  "BOQ & Estimates",
                  "Materials Tracking",
                  "Quotations",
                  "Task Management",
                  "AI Insights",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium text-stone-800">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-stone-200 bg-stone-100">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2
              className={cn(
                "max-w-2xl font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl",
              )}
            >
              Everything your site team already tracks—connected.
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">
              One workspace for the full job lifecycle, with membership roles
              for owners, admins, and field members.
            </p>

            <ul className="mt-12 divide-y divide-stone-200 border-y border-stone-200">
              {capabilities.map((item) => (
                <li
                  key={item.title}
                  className="grid gap-2 py-6 transition-colors duration-200 hover:bg-amber-500/5 sm:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] sm:gap-8"
                >
                  <h3 className="text-base font-semibold text-stone-900">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-6 text-stone-600 sm:text-base sm:leading-7">
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-stone-200 bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2
              className={cn(
                "max-w-3xl font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl",
              )}
            >
              New capabilities competitors still miss
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">
              Beyond basic project tracking, BuildPilot introduces AI, WhatsApp,
              a client portal, live estimate-vs-actual, and India/UAE locale—in
              one workspace built for site teams.
            </p>

            <div className="mt-10 hidden grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] gap-6 border-b border-stone-200 pb-4 text-xs font-semibold tracking-[0.14em] text-stone-500 uppercase sm:grid">
              <span>Feature we introduced</span>
              <span>What competitors usually offer</span>
              <span className="text-amber-700">BuildPilot</span>
            </div>

            <ul className="divide-y divide-stone-200 border-y border-stone-200 sm:border-t-0">
              {newVsCompetitors.map((item) => (
                <li
                  key={item.feature}
                  className="grid gap-4 py-7 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-6"
                >
                  <h3 className="text-base font-semibold text-stone-900">
                    {item.feature}
                  </h3>
                  <div>
                    <p className="mb-1 text-xs font-semibold tracking-[0.12em] text-stone-400 uppercase sm:hidden">
                      Competitors
                    </p>
                    <p className="text-sm leading-6 text-stone-500 sm:text-base sm:leading-7">
                      {item.competitors}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold tracking-[0.12em] text-amber-700 uppercase sm:hidden">
                      BuildPilot
                    </p>
                    <p className="text-sm leading-6 font-medium text-stone-800 sm:text-base sm:leading-7">
                      {item.ours}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-stone-200 bg-stone-100">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 sm:py-20 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2
                className={cn(
                  "font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl",
                )}
              >
                Start your construction workspace today.
              </h2>
              <p className="mt-3 text-base leading-7 text-stone-600">
                Sign up, pick India or UAE, and get the right currency
                automatically. Default language is English—switch anytime.
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

      <footer className="border-t border-stone-200 bg-stone-200/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} BuildPilot</p>
          <p>Construction management for civil engineers and contractors.</p>
        </div>
      </footer>
    </div>
  );
}
