import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import {
  addMonths as addJalaliMonths,
  endOfMonth as endOfJalaliMonth,
  getDate as getJalaliDay,
  getMonth as getJalaliMonth,
  getYear as getJalaliYear,
  newDate as newJalaliDate,
  startOfMonth as startOfJalaliMonth,
} from "date-fns-jalali";
import type { DateDisplayCalendar } from "@/types/api";
import { cn } from "@/app/lib/utils";
import { dateParts, parseIsoDate, toIsoDate } from "@/lib/helpers";

interface JalaliDatePickerProps {
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  calendar: DateDisplayCalendar;
  disabled?: boolean;
}

const WEEKDAY_LABELS_GREGORIAN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WEEKDAY_LABELS_SOLAR = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

function saturdayFirstIndex(day: Date): number {
  return (day.getDay() + 1) % 7;
}

function gregorianMonthLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
  }).format(value);
}

function solarMonthLabel(value: Date): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "long",
  }).format(value);
}

function formatSolarDay(value: number): string {
  return value.toLocaleString("fa-IR");
}

export function JalaliDatePicker({
  label,
  value,
  onChange,
  calendar,
  disabled = false,
}: JalaliDatePickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => parseIsoDate(value) ?? new Date());

  const selectedDate = useMemo(() => parseIsoDate(value), [value]);
  const selectedIso = selectedDate ? toIsoDate(selectedDate) : "";
  const selectedParts = dateParts(value);
  const isGregorian = calendar === "gregorian";

  useEffect(() => {
    const parsed = parseIsoDate(value);
    if (parsed) {
      setViewDate(parsed);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) {
        return;
      }

      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const monthStart = isGregorian
    ? new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
    : startOfJalaliMonth(viewDate);
  const monthEnd = isGregorian
    ? new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0)
    : endOfJalaliMonth(viewDate);
  const monthLabel = isGregorian ? gregorianMonthLabel(viewDate) : solarMonthLabel(viewDate);
  const leadingBlanks = isGregorian ? monthStart.getDay() : saturdayFirstIndex(monthStart);
  const daysInMonth = isGregorian ? monthEnd.getDate() : getJalaliDay(monthEnd);
  const viewYear = isGregorian ? viewDate.getFullYear() : getJalaliYear(viewDate);
  const viewMonth = isGregorian ? viewDate.getMonth() : getJalaliMonth(viewDate);

  const dayCells: Array<number | null> = [];
  for (let index = 0; index < leadingBlanks; index += 1) {
    dayCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    dayCells.push(day);
  }
  while (dayCells.length % 7 !== 0 || dayCells.length < 35) {
    dayCells.push(null);
  }

  const shiftMonth = (delta: number) => {
    if (isGregorian) {
      setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
      return;
    }

    setViewDate((current) => addJalaliMonths(current, delta));
  };

  return (
    <div className="relative w-full" ref={rootRef}>
      <label className="mb-1.5 block text-sm font-medium text-[var(--clockwork-gray-700)]">{label}</label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border border-[var(--clockwork-border)] bg-white px-3 py-2 text-left transition-all",
          "focus:outline-none focus:ring-2 focus:ring-[var(--clockwork-orange)] focus:border-transparent",
          disabled && "cursor-not-allowed bg-[var(--clockwork-gray-100)]",
        )}
      >
        {isGregorian ? (
          <div>
            <p className="text-sm text-[var(--clockwork-gray-900)]">{selectedParts.gregorian} (Gregorian)</p>
            <p className="text-xs text-[var(--clockwork-gray-500)]">{selectedParts.shamsi} (Solar)</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-[var(--clockwork-gray-900)]">{selectedParts.shamsi} (خورشیدی)</p>
            <p className="text-xs text-[var(--clockwork-gray-500)]">{selectedParts.gregorian} (میلادی)</p>
          </div>
        )}
        <CalendarDays className="h-4 w-4 text-[var(--clockwork-gray-500)]" />
      </button>

      {open ? (
        <div
          dir={isGregorian ? "ltr" : "rtl"}
          className="absolute z-30 mt-2 w-72 rounded-xl border border-[var(--clockwork-border)] bg-white p-3 shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              className="rounded-md p-1 text-[var(--clockwork-gray-700)] hover:bg-[var(--clockwork-gray-100)]"
              onClick={() => shiftMonth(-1)}
            >
              {isGregorian ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <p className="text-sm font-semibold text-[var(--clockwork-gray-900)]">{monthLabel}</p>
            <button
              type="button"
              className="rounded-md p-1 text-[var(--clockwork-gray-700)] hover:bg-[var(--clockwork-gray-100)]"
              onClick={() => shiftMonth(1)}
            >
              {isGregorian ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {(isGregorian ? WEEKDAY_LABELS_GREGORIAN : WEEKDAY_LABELS_SOLAR).map((labelText) => (
              <div key={labelText} className="py-1 text-center text-xs text-[var(--clockwork-gray-500)]">
                {labelText}
              </div>
            ))}

            {dayCells.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="h-8" />;
              }

              const dayDate = isGregorian
                ? new Date(viewYear, viewMonth, day, 12)
                : newJalaliDate(viewYear, viewMonth, day);
              const dayIso = toIsoDate(dayDate);
              const isSelected = dayIso === selectedIso;

              return (
                <button
                  key={dayIso}
                  type="button"
                  className={cn(
                    "h-8 rounded-md text-sm transition-colors",
                    isSelected
                      ? "bg-[var(--clockwork-orange)] text-white"
                      : "text-[var(--clockwork-gray-700)] hover:bg-[var(--clockwork-orange-light)]",
                  )}
                  onClick={() => {
                    onChange(dayIso);
                    setOpen(false);
                  }}
                >
                  {isGregorian ? day : formatSolarDay(day)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

