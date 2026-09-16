"use client";

import { cn } from "@/lib/utils";
import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

const OTP_LENGTH = 6;

function sanitizeDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export function OtpInput({
  value,
  onChange,
  disabled,
  error,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}) {
  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] ?? "");
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    if (!autoFocus) {
      return;
    }
    inputsRef.current[0]?.focus();
  }, [autoFocus]);

  function updateValue(next: string) {
    onChange(sanitizeDigits(next));
  }

  function focusIndex(index: number) {
    const clamped = Math.max(0, Math.min(OTP_LENGTH - 1, index));
    setFocusedIndex(clamped);
    inputsRef.current[clamped]?.focus();
    inputsRef.current[clamped]?.select();
  }

  function handleChange(index: number, raw: string) {
    const cleaned = sanitizeDigits(raw);
    if (!cleaned) {
      const next = digits.slice();
      next[index] = "";
      updateValue(next.join(""));
      return;
    }

    if (cleaned.length > 1) {
      const next = digits.slice();
      cleaned.split("").forEach((digit, offset) => {
        if (index + offset < OTP_LENGTH) {
          next[index + offset] = digit;
        }
      });
      updateValue(next.join(""));
      focusIndex(Math.min(OTP_LENGTH - 1, index + cleaned.length));
      return;
    }

    const next = digits.slice();
    next[index] = cleaned;
    updateValue(next.join(""));
    if (index < OTP_LENGTH - 1) {
      focusIndex(index + 1);
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (digits[index]) {
        const next = digits.slice();
        next[index] = "";
        updateValue(next.join(""));
        return;
      }
      if (index > 0) {
        const next = digits.slice();
        next[index - 1] = "";
        updateValue(next.join(""));
        focusIndex(index - 1);
      }
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusIndex(index - 1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusIndex(index + 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = sanitizeDigits(event.clipboardData.getData("text"));
    if (!pasted) {
      return;
    }
    updateValue(pasted);
    focusIndex(Math.min(OTP_LENGTH - 1, pasted.length));
  }

  return (
    <div
      className="flex items-center justify-center gap-2 sm:gap-3"
      role="group"
      aria-label="Verification code"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            inputsRef.current[index] = node;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          pattern="\d*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`Digit ${index + 1}`}
          onFocus={() => setFocusedIndex(index)}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          className={cn(
            "h-12 w-10 rounded-md border bg-white text-center text-lg font-semibold text-stone-900 shadow-sm outline-none transition sm:h-14 sm:w-12 sm:text-xl",
            "focus:ring-2",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : focusedIndex === index
                ? "border-amber-500 focus:border-amber-500 focus:ring-amber-100"
                : "border-stone-300 focus:border-amber-500 focus:ring-amber-100",
            disabled && "cursor-not-allowed opacity-60",
          )}
        />
      ))}
    </div>
  );
}
