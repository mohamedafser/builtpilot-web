import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_DATE_PRESET_LABELS,
  EXPENSE_DATE_PRESETS,
  EXPENSE_PAYMENT_METHOD_LABELS,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_STATUS_LABELS,
  type ExpenseDatePreset,
  isExpenseDatePreset,
} from "@/constants/expense";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDebouncedSearchQuery } from "@/hooks/use-debounced-search-query";
import { requestJson } from "@/lib/api/client";
import {
  endOfMonthIso,
  startOfMonthIso,
  startOfPreviousMonthIso,
  startOfWeekIso,
  todayIsoDate,
} from "@/lib/labour/money";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

function rangeForPreset(preset: ExpenseDatePreset): { from: string; to: string } {
  const today = todayIsoDate();

  if (preset === "this_week") {
    return { from: startOfWeekIso(today), to: today };
  }

  if (preset === "this_month") {
    return { from: startOfMonthIso(today), to: today };
  }

  if (preset === "last_month") {
    const from = startOfPreviousMonthIso(today);
    return { from, to: endOfMonthIso(from) };
  }

  if (preset === "custom") {
    return { from: today, to: today };
  }

  if (preset === "today") {
    return { from: today, to: today };
  }

  return { from: "", to: "" };
}

export function ExpenseFilters() {
  const searchParams = useSearchParams();
  const { value, setValue, applySearch, applyFilters } =
    useDebouncedSearchQuery();
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const preset = isExpenseDatePreset(searchParams.get("preset") ?? "")
    ? (searchParams.get("preset") as ExpenseDatePreset)
    : "this_month";
  const from = searchParams.get("from") ?? rangeForPreset(preset).from;
  const to = searchParams.get("to") ?? rangeForPreset(preset).to;
  const category = searchParams.get("category") ?? "";
  const vendorId = searchParams.get("vendor_id") ?? "";
  const paymentMethod = searchParams.get("payment_method") ?? "";
  const status = searchParams.get("status") ?? "active";

  useEffect(() => {
    let cancelled = false;

    void requestJson<{ vendors: { id: string; name: string }[] }>(
      "/api/vendors/active",
    ).then((result) => {
      if (cancelled || !result.ok) {
        return;
      }

      setVendors(
        result.data.vendors.map((vendor) => ({
          id: vendor.id,
          name: vendor.name,
        })),
      );
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applySearch();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end"
    >
      <div className="min-w-0 flex-1 lg:min-w-56">
        <label htmlFor="expense-search" className="sr-only">
          Search expenses
        </label>
        <Input
          id="expense-search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search description or reference"
          className="h-12 text-base lg:h-10 lg:text-sm"
        />
      </div>
      <div className="w-full lg:w-44">
        <label htmlFor="expense-preset" className="mb-1.5 block text-sm text-stone-600">
          Range
        </label>
        <Select
          id="expense-preset"
          value={preset}
          className="h-12 text-base lg:h-10 lg:text-sm"
          onChange={(event) => {
            const next = event.target.value as ExpenseDatePreset;
            const range = rangeForPreset(next);
            applyFilters((params) => {
              params.set("preset", next);
              if (next === "all") {
                params.delete("from");
                params.delete("to");
              } else if (next === "custom") {
                params.set("from", from || todayIsoDate());
                params.set("to", to || todayIsoDate());
              } else {
                params.set("from", range.from);
                params.set("to", range.to);
              }
            });
          }}
        >
          {EXPENSE_DATE_PRESETS.map((value) => (
            <option key={value} value={value}>
              {EXPENSE_DATE_PRESET_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>
      {preset === "custom" ? (
        <>
          <div className="w-full lg:w-40">
            <label htmlFor="expense-from" className="mb-1.5 block text-sm text-stone-600">
              From
            </label>
            <Input
              id="expense-from"
              type="date"
              value={from}
              className="h-12 text-base lg:h-10 lg:text-sm"
              onChange={(event) => {
                const nextFrom = event.target.value;
                applyFilters((params) => {
                  params.set("preset", "custom");
                  if (nextFrom) params.set("from", nextFrom);
                  else params.delete("from");
                });
              }}
            />
          </div>
          <div className="w-full lg:w-40">
            <label htmlFor="expense-to" className="mb-1.5 block text-sm text-stone-600">
              To
            </label>
            <Input
              id="expense-to"
              type="date"
              value={to}
              className="h-12 text-base lg:h-10 lg:text-sm"
              onChange={(event) => {
                const nextTo = event.target.value;
                applyFilters((params) => {
                  params.set("preset", "custom");
                  if (nextTo) params.set("to", nextTo);
                  else params.delete("to");
                });
              }}
            />
          </div>
        </>
      ) : null}
      <div className="w-full lg:w-44">
        <label htmlFor="expense-category" className="mb-1.5 block text-sm text-stone-600">
          Category
        </label>
        <Select
          id="expense-category"
          value={category}
          className="h-12 text-base lg:h-10 lg:text-sm"
          onChange={(event) => {
            const next = event.target.value;
            applyFilters((params) => {
              if (next) params.set("category", next);
              else params.delete("category");
            });
          }}
        >
          <option value="">All categories</option>
          {EXPENSE_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {EXPENSE_CATEGORY_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-full lg:w-44">
        <label htmlFor="expense-vendor" className="mb-1.5 block text-sm text-stone-600">
          Vendor
        </label>
        <Select
          id="expense-vendor"
          value={vendorId}
          className="h-12 text-base lg:h-10 lg:text-sm"
          onChange={(event) => {
            const next = event.target.value;
            applyFilters((params) => {
              if (next) params.set("vendor_id", next);
              else params.delete("vendor_id");
            });
          }}
        >
          <option value="">All vendors</option>
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-full lg:w-40">
        <label
          htmlFor="expense-payment"
          className="mb-1.5 block text-sm text-stone-600"
        >
          Payment
        </label>
        <Select
          id="expense-payment"
          value={paymentMethod}
          className="h-12 text-base lg:h-10 lg:text-sm"
          onChange={(event) => {
            const next = event.target.value;
            applyFilters((params) => {
              if (next) params.set("payment_method", next);
              else params.delete("payment_method");
            });
          }}
        >
          <option value="">All methods</option>
          {EXPENSE_PAYMENT_METHODS.map((value) => (
            <option key={value} value={value}>
              {EXPENSE_PAYMENT_METHOD_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-full lg:w-36">
        <label htmlFor="expense-status" className="mb-1.5 block text-sm text-stone-600">
          Status
        </label>
        <Select
          id="expense-status"
          value={status}
          className="h-12 text-base lg:h-10 lg:text-sm"
          onChange={(event) => {
            const next = event.target.value;
            applyFilters((params) => {
              if (next && next !== "active") params.set("status", next);
              else params.delete("status");
            });
          }}
        >
          <option value="active">{EXPENSE_STATUS_LABELS.active}</option>
          <option value="void">{EXPENSE_STATUS_LABELS.void}</option>
          <option value="all">All</option>
        </Select>
      </div>
    </form>
  );
}
