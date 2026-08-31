/** 项目导读：通用 UI 组件 DatePicker：统一视觉与交互细节；小零件也按规矩来，页面才不会拼成百家被。 */
"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
};

const weekDays = ["一", "二", "三", "四", "五", "六", "日"];

export function DatePicker({
  value,
  defaultValue = "",
  onChange,
  min,
  max,
  disabled = false,
  required = false,
  ariaLabel = "选择日期",
  placeholder = "请选择日期",
  className
}: DatePickerProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = value ?? internalValue;
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(parseDate(selectedValue) ?? new Date()));
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogId = useId();
  const days = useMemo(() => calendarDays(visibleMonth), [visibleMonth]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function updateValue(nextValue: string) {
    if (value === undefined) setInternalValue(nextValue);
    onChange?.(nextValue);
    if (nextValue) setVisibleMonth(startOfMonth(parseDate(nextValue) ?? new Date()));
  }

  function openCalendar() {
    if (disabled) return;
    setVisibleMonth(startOfMonth(parseDate(selectedValue) ?? new Date()));
    setOpen((current) => !current);
  }

  function chooseDate(date: Date) {
    updateValue(toDateValue(date));
    setOpen(false);
    triggerRef.current?.focus();
  }

  const todayValue = toDateValue(new Date());

  return (
    <div className={cn("relative", className)} ref={wrapperRef}>
      <button
        aria-controls={dialogId}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-3 rounded-[10px] border border-black/[0.16] bg-white/90 px-3 text-left text-sm shadow-[inset_0_0_0_.5px_rgba(255,255,255,.6),0_1px_2px_rgba(0,0,0,.025)] transition-[border-color,box-shadow,background-color] duration-150",
          "hover:border-black/25 focus-visible:border-[#0071e3] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/15",
          disabled ? "cursor-not-allowed bg-black/[0.035] text-[#aeaeb2]" : "text-[#1d1d1f]",
          open && "border-[#0071e3] ring-4 ring-[#0071e3]/15"
        )}
        disabled={disabled}
        onClick={openCalendar}
        ref={triggerRef}
        type="button"
      >
        <span className={selectedValue ? "font-medium" : "text-[#98989d]"}>{selectedValue ? formatDateLabel(selectedValue) : placeholder}</span>
        <CalendarDays className={open ? "text-[#0071e3]" : "text-[#86868b]"} size={18} />
      </button>

      {open ? (
        <div
          aria-label={`${ariaLabel}日历`}
          className="date-picker-popover absolute left-0 top-[calc(100%+8px)] z-[80] w-[min(19rem,calc(100vw-2rem))] origin-top-left rounded-[16px] border border-white/80 bg-white/95 p-3 shadow-[0_18px_50px_rgba(0,0,0,.18),0_2px_8px_rgba(0,0,0,.08)] backdrop-blur-2xl"
          id={dialogId}
          role="dialog"
        >
          <div className="flex items-center justify-between px-1 pb-3">
            <button aria-label="上个月" className={calendarControlClass} onClick={() => setVisibleMonth((current) => addMonths(current, -1))} type="button"><ChevronLeft size={17} /></button>
            <p aria-live="polite" className="text-sm font-semibold tracking-[-0.01em] text-[#1d1d1f]">{visibleMonth.getFullYear()} 年 {visibleMonth.getMonth() + 1} 月</p>
            <button aria-label="下个月" className={calendarControlClass} onClick={() => setVisibleMonth((current) => addMonths(current, 1))} type="button"><ChevronRight size={17} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1" role="grid">
            {weekDays.map((day) => <div aria-hidden="true" className="flex h-7 items-center justify-center text-[11px] font-medium text-[#86868b]" key={day}>{day}</div>)}
            {days.map((date, index) => {
              if (!date) return <span aria-hidden="true" className="size-9" key={`empty-${index}`} />;
              const dateValue = toDateValue(date);
              const selected = dateValue === selectedValue;
              const today = dateValue === todayValue;
              const unavailable = Boolean((min && dateValue < min) || (max && dateValue > max));
              return (
                <button
                  aria-label={formatDateLabel(dateValue)}
                  aria-pressed={selected}
                  className={cn(
                    "relative flex size-9 items-center justify-center rounded-full text-[13px] font-medium transition-[background-color,color,box-shadow,transform] duration-150",
                    selected ? "bg-[#0071e3] text-white shadow-[0_3px_10px_rgba(0,113,227,.28)]" : "text-[#3a3a3c] hover:bg-black/[0.06]",
                    today && !selected && "font-semibold text-[#0071e3] ring-1 ring-inset ring-[#0071e3]/25",
                    unavailable && "cursor-not-allowed text-[#c7c7cc] hover:bg-transparent"
                  )}
                  disabled={unavailable}
                  key={dateValue}
                  onClick={() => chooseDate(date)}
                  role="gridcell"
                  type="button"
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-black/[0.07] px-1 pt-3">
            {!required && selectedValue ? <button className="inline-flex h-8 items-center gap-1 rounded-[8px] px-2 text-xs font-medium text-[#6e6e73] hover:bg-black/[0.055]" onClick={() => { updateValue(""); setOpen(false); }} type="button"><X size={13} />清除</button> : <span />}
            <button className="h-8 rounded-[8px] px-2.5 text-xs font-semibold text-[#0066cc] hover:bg-[#0071e3]/10" disabled={Boolean((min && todayValue < min) || (max && todayValue > max))} onClick={() => chooseDate(new Date())} type="button">今天</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const calendarControlClass = "flex size-9 items-center justify-center rounded-full text-[#515154] transition-colors hover:bg-black/[0.06] hover:text-[#1d1d1f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/15";

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function calendarDays(month: Date) {
  const leadingEmptyDays = (month.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return [...Array.from({ length: leadingEmptyDays }, () => null), ...Array.from({ length: count }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))];
}

function toDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateLabel(value: string) {
  const date = parseDate(value);
  return date ? `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日` : value;
}
