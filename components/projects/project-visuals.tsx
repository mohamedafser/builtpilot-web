import { cn } from "@/lib/utils";

export function CircularProgress({
  percent,
  size = 140,
  stroke = 12,
  label,
  sublabel,
}: {
  percent: number | null;
  size?: number;
  stroke?: number;
  label: string;
  sublabel?: string;
}) {
  const value = Math.min(100, Math.max(0, percent ?? 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const hasData = percent != null;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f5f5f4"
            strokeWidth={stroke}
          />
          {hasData ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#d97706"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          ) : null}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
          <p
            className={cn(
              "font-semibold text-stone-900 tabular-nums",
              size <= 96 ? "text-lg" : "text-2xl",
            )}
          >
            {hasData ? `${value % 1 === 0 ? value : value.toFixed(0)}%` : "—"}
          </p>
          <p className="text-[10px] leading-tight text-stone-500">{label}</p>
        </div>
      </div>
      {sublabel ? (
        <p
          className={cn(
            "mt-1 max-w-[9rem] text-center text-stone-500",
            size <= 96 ? "text-[10px]" : "mt-2 max-w-[11rem] text-xs",
          )}
        >
          {sublabel}
        </p>
      ) : null}
    </div>
  );
}

export function BudgetDonut({
  usedPercent,
  status,
}: {
  usedPercent: number | null;
  status: "within_budget" | "over_budget" | "no_budget";
}) {
  const size = 120;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const raw = usedPercent ?? 0;
  const capped = Math.min(100, Math.max(0, raw));
  const over = status === "over_budget" || raw > 100;
  const color = over ? "#dc2626" : raw >= 85 ? "#d97706" : "#059669";
  const length = status === "no_budget" ? 0 : (capped / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f5f5f4"
          strokeWidth={stroke}
        />
        {status !== "no_budget" ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={0}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xl font-semibold text-stone-900 tabular-nums">
          {usedPercent == null
            ? "—"
            : `${raw % 1 === 0 ? raw : raw.toFixed(0)}%`}
        </p>
        <p className="text-[10px] text-stone-500">used</p>
      </div>
    </div>
  );
}

export function MonthlySpendChart({
  months,
}: {
  months: Array<{ label: string; total: number }>;
}) {
  if (!months.length || months.every((month) => month.total <= 0)) {
    return (
      <p className="text-sm text-stone-500">
        Spending over time will appear after costs are recorded.
      </p>
    );
  }

  const max = Math.max(...months.map((month) => month.total), 1);

  return (
    <div className="flex h-36 items-end gap-2 sm:gap-3">
      {months.map((month) => {
        const height = Math.max(4, (month.total / max) * 100);
        return (
          <div
            key={month.label}
            className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
          >
            <div className="flex h-28 w-full items-end justify-center">
              <div
                className="w-full max-w-8 rounded-t-md bg-amber-500/90"
                style={{ height: `${height}%` }}
                title={String(month.total)}
              />
            </div>
            <span className="truncate text-[10px] text-stone-500">
              {month.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export type StageItem = {
  id: string;
  name: string;
  percent: number | null;
  state: "completed" | "in_progress" | "upcoming";
};

export function StageRail({ stages }: { stages: StageItem[] }) {
  if (!stages.length) {
    return null;
  }

  return (
    <ol className="flex gap-2 overflow-x-auto pb-1">
      {stages.map((stage, index) => (
        <li
          key={`${stage.id}-${index}`}
          className="flex min-w-[7.5rem] flex-1 flex-col items-stretch"
        >
          <div className="mb-2 flex items-center gap-1.5">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                stage.state === "completed" &&
                  "bg-emerald-100 text-emerald-800",
                stage.state === "in_progress" && "bg-amber-100 text-amber-800",
                stage.state === "upcoming" && "bg-stone-100 text-stone-500",
              )}
            >
              {stage.state === "completed" ? "✓" : index + 1}
            </span>
            {index < stages.length - 1 ? (
              <span
                className={cn(
                  "h-0.5 flex-1 rounded-full",
                  stage.state === "completed"
                    ? "bg-emerald-300"
                    : "bg-stone-200",
                )}
              />
            ) : null}
          </div>
          <p className="truncate text-xs font-medium text-stone-800">
            {stage.name}
          </p>
          <p className="mt-0.5 text-[11px] text-stone-500">
            {stage.state === "completed"
              ? "Done"
              : stage.state === "in_progress"
                ? stage.percent != null
                  ? `${Math.round(stage.percent)}% done`
                  : "In progress"
                : "Upcoming"}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div
              className={cn(
                "h-full rounded-full",
                stage.state === "completed" && "bg-emerald-500",
                stage.state === "in_progress" && "bg-amber-500",
                stage.state === "upcoming" && "bg-stone-300",
              )}
              style={{
                width: `${Math.min(100, Math.max(0, stage.percent ?? (stage.state === "completed" ? 100 : 0)))}%`,
              }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function HealthPill({
  label,
  tone,
}: {
  label: string;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "good" && "bg-emerald-100 text-emerald-800",
        tone === "warn" && "bg-amber-100 text-amber-800",
        tone === "bad" && "bg-red-100 text-red-700",
        tone === "neutral" && "bg-stone-100 text-stone-600",
      )}
    >
      {label}
    </span>
  );
}
