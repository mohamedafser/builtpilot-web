import { formatMoney } from "@/lib/i18n/money";
import type { AttendanceStatus, WorkerRole } from "@/types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PAISA_PER_RUPEE = 100;

export function todayIsoDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftIsoDate(value: string, days: number): string {
  const date = parseIsoDate(value);

  if (!date) {
    return value;
  }

  date.setDate(date.getDate() + days);
  return todayIsoDate(date);
}

export function parseIsoDate(value: string): Date | null {
  if (!ISO_DATE.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfWeekIso(value: string): string {
  const date = parseIsoDate(value);

  if (!date) {
    return value;
  }

  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  return todayIsoDate(date);
}

export function startOfMonthIso(value: string): string {
  if (!ISO_DATE.test(value)) {
    return value;
  }

  return `${value.slice(0, 7)}-01`;
}

export function startOfPreviousMonthIso(value: string): string {
  const date = parseIsoDate(startOfMonthIso(value));

  if (!date) {
    return value;
  }

  date.setMonth(date.getMonth() - 1);
  return todayIsoDate(date);
}

export function endOfMonthIso(value: string): string {
  const date = parseIsoDate(startOfMonthIso(value));

  if (!date) {
    return value;
  }

  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  return todayIsoDate(date);
}

export function monthsAgoStartIso(value: string, monthsBack: number): string {
  const date = parseIsoDate(startOfMonthIso(value));

  if (!date) {
    return value;
  }

  date.setMonth(date.getMonth() - monthsBack);
  return todayIsoDate(date);
}

export function isIsoDate(value: string): boolean {
  return Boolean(parseIsoDate(value));
}

export function parseMoneyToPaise(value: string | number): number | null {
  const raw = typeof value === "number" ? value.toFixed(2) : value.trim();

  if (!raw || !/^\d+(\.\d{1,2})?$/.test(raw)) {
    return null;
  }

  const [whole, fraction = ""] = raw.split(".");
  const fraction2 = `${fraction}00`.slice(0, 2);
  return Number(whole) * PAISA_PER_RUPEE + Number(fraction2);
}

export function formatPaise(paise: number): string {
  const negative = paise < 0;
  const absolute = Math.abs(Math.trunc(paise));
  const whole = Math.trunc(absolute / PAISA_PER_RUPEE);
  const fraction = String(absolute % PAISA_PER_RUPEE).padStart(2, "0");
  const formatted = `${whole}.${fraction}`;
  return negative ? `-${formatted}` : formatted;
}

export function addPaise(values: Array<string | number>): number {
  let total = 0;

  for (const value of values) {
    const paise = parseMoneyToPaise(value);
    if (paise !== null) {
      total += paise;
    }
  }

  return total;
}

export function calculateAttendanceWage(
  dailyWage: string | number,
  status: AttendanceStatus,
): string {
  if (status === "absent") {
    return "0.00";
  }

  const paise = parseMoneyToPaise(dailyWage);

  if (paise === null) {
    return "0.00";
  }

  if (status === "half_day") {
    return formatPaise(Math.trunc(paise / 2));
  }

  return formatPaise(paise);
}

export function dayRateFromAttendance(
  status: AttendanceStatus,
  storedWage: string,
  currentDailyWage: string,
): string {
  if (status === "absent") {
    return currentDailyWage;
  }

  if (status === "half_day") {
    const paise = parseMoneyToPaise(storedWage);
    if (paise === null) {
      return currentDailyWage;
    }

    return formatPaise(paise * 2);
  }

  return storedWage || currentDailyWage;
}

export function labourDayUnits(status: AttendanceStatus): number {
  if (status === "present") {
    return 2;
  }

  if (status === "half_day") {
    return 1;
  }

  return 0;
}

export function formatLabourDays(halfDayUnits: number): string {
  const whole = Math.trunc(halfDayUnits / 2);
  return halfDayUnits % 2 === 1 ? `${whole}.5` : String(whole);
}

export function formatAverageWorkers(
  halfDayUnits: number,
  dayCount: number,
): string {
  if (dayCount <= 0) {
    return "0";
  }

  const average = halfDayUnits / 2 / dayCount;
  const rounded = Math.round(average * 10) / 10;

  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatLabourCost(
  value: string | number | null,
  currencyCode?: string | null,
): string {
  return formatMoney(value, currencyCode);
}

export function defaultHoursForStatus(status: AttendanceStatus): string {
  if (status === "present") {
    return "8";
  }

  if (status === "half_day") {
    return "4";
  }

  return "0";
}

export function emptyRoleTotals(): Record<
  WorkerRole,
  { labour_days: string; labour_cost: string; records: number }
> {
  return {
    mason: { labour_days: "0", labour_cost: "0.00", records: 0 },
    helper: { labour_days: "0", labour_cost: "0.00", records: 0 },
    carpenter: { labour_days: "0", labour_cost: "0.00", records: 0 },
    electrician: { labour_days: "0", labour_cost: "0.00", records: 0 },
    plumber: { labour_days: "0", labour_cost: "0.00", records: 0 },
    painter: { labour_days: "0", labour_cost: "0.00", records: 0 },
    welder: { labour_days: "0", labour_cost: "0.00", records: 0 },
    operator: { labour_days: "0", labour_cost: "0.00", records: 0 },
    supervisor: { labour_days: "0", labour_cost: "0.00", records: 0 },
    other: { labour_days: "0", labour_cost: "0.00", records: 0 },
  };
}
