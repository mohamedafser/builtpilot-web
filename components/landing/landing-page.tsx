"use client";

import { AnimatedShowcase } from "@/components/landing/animated-showcase";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Logo } from "@/components/layout/logo";
import { PwaInstallBanner } from "@/components/pwa/install-banner";
import { linkButtonClassName } from "@/components/ui/button";
import { WithIcon } from "@/components/ui/with-icon";
import { useLocale } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Building2,
  CircleDollarSign,
  ClipboardList,
  FileText,
  KeyRound,
  LogIn,
  MonitorSmartphone,
  Package,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Bricolage_Grotesque } from "next/font/google";
import Link from "next/link";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-landing-display",
});

const featureCards: {
  titleKey: MessageKey;
  descriptionKey: MessageKey;
  icon: typeof Building2;
}[] = [
  {
    titleKey: "landing.featureProjects",
    descriptionKey: "landing.featureProjectsDesc",
    icon: Building2,
  },
  {
    titleKey: "landing.featureBoq",
    descriptionKey: "landing.featureBoqDesc",
    icon: ClipboardList,
  },
  {
    titleKey: "landing.featureMaterials",
    descriptionKey: "landing.featureMaterialsDesc",
    icon: Package,
  },
  {
    titleKey: "landing.featureQuotes",
    descriptionKey: "landing.featureQuotesDesc",
    icon: FileText,
  },
  {
    titleKey: "landing.featureTeam",
    descriptionKey: "landing.featureTeamDesc",
    icon: Users,
  },
  {
    titleKey: "landing.featureCost",
    descriptionKey: "landing.featureCostDesc",
    icon: CircleDollarSign,
  },
];

const workflowSteps: {
  step: string;
  titleKey: MessageKey;
  descriptionKey: MessageKey;
}[] = [
  {
    step: "01",
    titleKey: "landing.workflow1Title",
    descriptionKey: "landing.workflow1Desc",
  },
  {
    step: "02",
    titleKey: "landing.workflow2Title",
    descriptionKey: "landing.workflow2Desc",
  },
  {
    step: "03",
    titleKey: "landing.workflow3Title",
    descriptionKey: "landing.workflow3Desc",
  },
  {
    step: "04",
    titleKey: "landing.workflow4Title",
    descriptionKey: "landing.workflow4Desc",
  },
];

const trustPoints: {
  titleKey: MessageKey;
  descriptionKey: MessageKey;
  icon: typeof KeyRound;
}[] = [
  {
    titleKey: "landing.trustOtpTitle",
    descriptionKey: "landing.trustOtpDesc",
    icon: KeyRound,
  },
  {
    titleKey: "landing.trustInviteTitle",
    descriptionKey: "landing.trustInviteDesc",
    icon: Users,
  },
  {
    titleKey: "landing.trustRolesTitle",
    descriptionKey: "landing.trustRolesDesc",
    icon: ShieldCheck,
  },
  {
    titleKey: "landing.trustPwaTitle",
    descriptionKey: "landing.trustPwaDesc",
    icon: MonitorSmartphone,
  },
];

const heroBadges: MessageKey[] = [
  "landing.badgeIndiaUae",
  "landing.badgeCurrency",
  "landing.badgeTeamRoles",
  "landing.badgePwa",
  "landing.badgeOtp",
];

export function LandingPage() {
  const { t } = useLocale();

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
          <LanguageSwitcher />
          <Link href="/login" className={linkButtonClassName("ghost", "md")}>
            <WithIcon icon={LogIn}>{t("common.signIn")}</WithIcon>
          </Link>
          <Link href="/signup" className={linkButtonClassName("primary", "md")}>
            <WithIcon icon={ArrowRight}>{t("common.getStarted")}</WithIcon>
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
                {t("landing.badge")}
              </div>

              <h1
                className={cn(
                  "font-[family-name:var(--font-landing-display)] text-4xl leading-tight font-semibold tracking-tight text-stone-950 sm:text-5xl lg:text-6xl",
                )}
              >
                {t("landing.headline")}
              </h1>

              <p className="mt-4 max-w-xl text-base leading-7 text-stone-600 sm:text-lg">
                {t("landing.subhead")}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/signup"
                  className={cn(
                    linkButtonClassName("primary", "lg"),
                    "transition-transform duration-200 hover:-translate-y-0.5",
                  )}
                >
                  <WithIcon icon={ArrowRight}>{t("landing.startFree")}</WithIcon>
                </Link>
                <Link
                  href="/login"
                  className={linkButtonClassName("secondary", "lg")}
                >
                  <WithIcon icon={LogIn}>{t("common.signIn")}</WithIcon>
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {heroBadges.map((badgeKey) => (
                  <span
                    key={badgeKey}
                    className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600"
                  >
                    {t(badgeKey)}
                  </span>
                ))}
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
                {t("landing.platformEyebrow")}
              </p>
              <h2
                className={cn(
                  "mt-2 font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl",
                )}
              >
                {t("landing.platformTitle")}
              </h2>
              <p className="mt-3 text-base leading-7 text-stone-600">
                {t("landing.platformBody")}
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featureCards.map(
                ({ titleKey, descriptionKey, icon: Icon }, index) => (
                  <div
                    key={titleKey}
                    className="group rounded-2xl border border-stone-200 bg-stone-50/50 p-5 transition duration-200 hover:-translate-y-1 hover:border-amber-200 hover:bg-white hover:shadow-[0_18px_40px_-28px_rgba(28,25,23,0.35)]"
                    style={{ animationDelay: `${index * 120}ms` }}
                  >
                    <div className="landing-feature-icon mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 ring-1 ring-amber-200/60">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold text-stone-900">
                      {t(titleKey)}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      {t(descriptionKey)}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        <section id="workflow" className="border-t border-stone-200 bg-stone-50">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.18em] text-amber-700 uppercase">
                {t("landing.workflowEyebrow")}
              </p>
              <h2
                className={cn(
                  "mt-2 font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl",
                )}
              >
                {t("landing.workflowTitle")}
              </h2>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {workflowSteps.map(({ step, titleKey, descriptionKey }) => (
                <div
                  key={step}
                  className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-xs font-bold text-amber-800">
                    {step}
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-stone-900">
                    {t(titleKey)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    {t(descriptionKey)}
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
                  {t("landing.aiEyebrow")}
                </p>
                <h2
                  className={cn(
                    "mt-2 font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl",
                  )}
                >
                  {t("landing.aiTitle")}
                </h2>
                <p className="mt-3 text-base leading-7 text-stone-600">
                  {t("landing.aiBody")}
                </p>
              </div>

              <div className="landing-ai-panel rounded-2xl border border-stone-200 bg-[#171412] p-5 text-stone-50 shadow-[0_24px_60px_-28px_rgba(28,25,23,0.55)]">
                <div className="flex items-center gap-2 border-b border-white/10 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-stone-950">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.16em] text-stone-400 uppercase">
                      {t("landing.aiEyebrow")}
                    </p>
                    <p className="text-sm font-medium text-white">
                      Project copilot
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="landing-ai-message landing-ai-message-user rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                    {t("landing.aiUser")}
                  </div>
                  <div className="landing-ai-message landing-ai-message-ai rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-stone-100">
                    {t("landing.aiReply")}
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
                {t("landing.trustEyebrow")}
              </p>
              <h2
                className={cn(
                  "mt-2 font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl",
                )}
              >
                {t("landing.trustTitle")}
              </h2>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trustPoints.map(({ titleKey, descriptionKey, icon: Icon }) => (
                <div
                  key={titleKey}
                  className="flex gap-4 rounded-2xl border border-stone-200 bg-white p-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900">
                      {t(titleKey)}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-stone-600">
                      {t(descriptionKey)}
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
                {t("landing.ctaTitle")}
              </h2>
              <p className="mt-3 text-base leading-7 text-stone-600">
                {t("landing.ctaBody")}
              </p>
            </div>
            <Link
              href="/signup"
              className={cn(
                linkButtonClassName("primary", "lg"),
                "shrink-0 transition-transform duration-200 hover:-translate-y-0.5",
              )}
            >
              <WithIcon icon={Sparkles}>{t("landing.ctaAction")}</WithIcon>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-stone-100">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} BuildPilot</p>
          <p>{t("landing.footerTagline")}</p>
        </div>
      </footer>
    </div>
  );
}
