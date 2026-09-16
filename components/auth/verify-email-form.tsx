"use client";

import { OtpInput } from "@/components/auth/otp-input";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requestJson } from "@/lib/api/client";
import { AUTH_MESSAGES } from "@/lib/auth/constants";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

type VerificationSession = {
  email: string;
  expiresAt: number;
  retryAfterSeconds: number;
};

type VerifyResponse = {
  redirectTo: string;
};

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function VerifyEmailForm({
  initialMessage,
}: {
  initialMessage?: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [otp, setOtp] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    initialMessage ?? null,
  );
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpKey, setOtpKey] = useState(0);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isVerifying, startVerifyTransition] = useTransition();
  const [isResending, startResendTransition] = useTransition();

  const remainingSeconds = useMemo(() => {
    if (!expiresAt) {
      return 0;
    }
    return Math.max(0, Math.ceil((expiresAt - now) / 1000));
  }, [expiresAt, now]);

  const expired = Boolean(expiresAt && remainingSeconds <= 0);
  const canVerify = otp.length === 6 && !expired && !isVerifying;

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const result = await requestJson<VerificationSession>(
        "/api/auth/verification-session",
        { method: "GET", notify: false },
      );

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setFormError(result.message || AUTH_MESSAGES.verifyOtpMissingSession);
        setLoadingSession(false);
        return;
      }

      setEmail(result.data.email);
      setExpiresAt(result.data.expiresAt);
      setResendCooldown(result.data.retryAfterSeconds ?? 0);
      setLoadingSession(false);
    }

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  function onVerify() {
    if (!email || !canVerify) {
      return;
    }

    setFormError(null);
    setSuccessMessage(null);

    startVerifyTransition(async () => {
      const result = await requestJson<VerifyResponse>(
        "/api/auth/verify-signup",
        {
          method: "POST",
          body: JSON.stringify({ email, token: otp }),
          notify: false,
        },
      );

      if (!result.ok) {
        setFormError(result.message);
        if (result.message === AUTH_MESSAGES.verifyOtpExpired) {
          setExpiresAt(Date.now());
        }
        return;
      }

      setSuccessMessage(result.message || AUTH_MESSAGES.verifyOtpSuccess);
      router.push(result.data.redirectTo || "/dashboard");
      router.refresh();
    });
  }

  function onResend() {
    if (!email || resendCooldown > 0) {
      return;
    }

    setFormError(null);

    startResendTransition(async () => {
      const result = await requestJson<VerificationSession>(
        "/api/auth/resend-signup",
        {
          method: "POST",
          body: JSON.stringify({ email }),
          notify: false,
        },
      );

      if (!result.ok) {
        setFormError(result.message);
        if (result.message === AUTH_MESSAGES.rateLimited) {
          setResendCooldown(60);
        }
        return;
      }

      setExpiresAt(result.data.expiresAt);
      setResendCooldown(result.data.retryAfterSeconds ?? 60);
      setOtp("");
      setOtpKey((key) => key + 1);
      setSuccessMessage(result.message || AUTH_MESSAGES.signupResendSuccess);
      setNow(Date.now());
    });
  }

  if (loadingSession) {
    return (
      <p className="text-center text-sm text-stone-500">
        Loading verification…
      </p>
    );
  }

  if (!email) {
    return (
      <div className="space-y-4">
        <Alert variant="error">
          {formError || AUTH_MESSAGES.verifyOtpMissingSession}
        </Alert>
        <p className="text-center text-sm text-stone-500">
          <Link
            href="/signup"
            className="font-medium text-amber-700 transition-colors hover:text-amber-800"
          >
            Create an account
          </Link>
          {" · "}
          <Link
            href="/login"
            className="font-medium text-amber-700 transition-colors hover:text-amber-800"
          >
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {successMessage ? (
        <Alert variant="success">{successMessage}</Alert>
      ) : null}
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-600">
        <p>
          We&apos;ve sent a 6-digit verification code to{" "}
          <span className="font-medium text-stone-800">{email}</span>.
        </p>
        <p className="mt-1">
          Enter the code below to verify your BuildPilot account.
        </p>
      </div>

      <OtpInput
        key={otpKey}
        value={otp}
        onChange={(value) => {
          setOtp(value);
          setFormError(null);
        }}
        disabled={isVerifying || isResending}
        error={Boolean(formError)}
        autoFocus
      />

      <div className="text-center text-sm text-stone-600">
        {expired ? (
          <p className="font-medium text-red-600">
            Your verification code has expired.
          </p>
        ) : (
          <p>
            Code expires in{" "}
            <span className="font-semibold tabular-nums text-stone-800">
              {formatCountdown(remainingSeconds)}
            </span>
          </p>
        )}
      </div>

      {!expired ? (
        <Button
          type="button"
          size="lg"
          fullWidth
          disabled={!canVerify}
          icon={ShieldCheck}
          onClick={onVerify}
        >
          {isVerifying ? "Verifying..." : "Verify Email"}
        </Button>
      ) : (
        <Button
          type="button"
          size="lg"
          fullWidth
          disabled={resendCooldown > 0 || isResending}
          onClick={onResend}
        >
          {isResending
            ? "Sending..."
            : resendCooldown > 0
              ? `Resend available in ${formatCountdown(resendCooldown)}`
              : "Resend Verification Code"}
        </Button>
      )}

      {!expired ? (
        <div className="space-y-2 text-center text-sm text-stone-500">
          <p>Didn&apos;t receive the code?</p>
          <button
            type="button"
            disabled={resendCooldown > 0 || isResending}
            onClick={onResend}
            className="font-medium text-amber-700 transition-colors hover:text-amber-800 disabled:cursor-not-allowed disabled:text-stone-400"
          >
            {isResending
              ? "Sending..."
              : resendCooldown > 0
                ? `Resend code in ${formatCountdown(resendCooldown)}`
                : "Resend code"}
          </button>
        </div>
      ) : null}

      <p className="text-center text-sm text-stone-500">
        Wrong account?{" "}
        <Link
          href="/login"
          className="font-medium text-amber-700 transition-colors hover:text-amber-800"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
