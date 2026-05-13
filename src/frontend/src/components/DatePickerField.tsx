"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Parse `YYYY-MM-DD` in local calendar (no UTC shift). */
export function parseIsoDateLocal(iso: string): Date | undefined {
  const t = String(iso ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return undefined;
  const [y, m, d] = t.split("-").map((n) => Number(n));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
    return undefined;
  return new Date(y, m - 1, d);
}

export function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export type DatePickerFieldProps = {
  id?: string;
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Inclusive first selectable day (local midnight). */
  fromDate?: Date;
  /** Inclusive last selectable day (local end of day handled by matcher). */
  toDate?: Date;
  /** Extra disabled rule (e.g. blackout nights). */
  disableDate?: (d: Date) => boolean;
  className?: string;
  triggerClassName?: string;
  popoverContentClassName?: string;
  align?: "start" | "center" | "end";
  /** Renders a hidden required input for native form validation. */
  required?: boolean;
};

export default function DatePickerField({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  fromDate,
  toDate,
  disableDate,
  className,
  triggerClassName,
  popoverContentClassName,
  align = "start",
  required,
}: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false);
  const selected = React.useMemo(() => parseIsoDateLocal(value), [value]);

  const disabledMatcher = React.useMemo(() => {
    return (d: Date) => {
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (fromDate) {
        const f = new Date(
          fromDate.getFullYear(),
          fromDate.getMonth(),
          fromDate.getDate(),
        );
        if (dayStart.getTime() < f.getTime()) return true;
      }
      if (toDate) {
        const e = new Date(
          toDate.getFullYear(),
          toDate.getMonth(),
          toDate.getDate(),
        );
        if (dayStart.getTime() > e.getTime()) return true;
      }
      if (disableDate?.(d)) return true;
      return false;
    };
  }, [fromDate, toDate, disableDate]);

  const defaultMonth = selected ?? fromDate ?? new Date();

  return (
    <div className={cn("w-full", className)}>
      {required ? (
        <input
          type="hidden"
          value={value}
          required={required}
          readOnly
          tabIndex={-1}
          aria-hidden
          className="sr-only"
        />
      ) : null}
      <Popover modal={false} open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal h-10 px-3",
              !value && "text-muted-foreground",
              triggerClassName,
            )}
          >
            <CalendarIcon
              className="mr-2 h-4 w-4 shrink-0 opacity-70"
              aria-hidden
            />
            {selected ? (
              format(selected, "dd MMM yyyy")
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn("w-auto p-0 z-[200]", popoverContentClassName)}
          align={align}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => {
              onChange(d ? toIsoDateLocal(d) : "");
              setOpen(false);
            }}
            disabled={disabledMatcher}
            defaultMonth={defaultMonth}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
