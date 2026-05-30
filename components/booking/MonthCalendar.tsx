"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, addMonths, subMonths, isSameDay, isBefore, startOfDay, isToday,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlotInfo {
  id: string;
  time: string;
}

interface DayAvailability {
  slots: Record<string, { count: number; available: number; full: boolean }>;
  totalAvailable: number;
}

interface AvailabilityData {
  availability: Record<string, DayAvailability>;
  maxPerSlot: number;
  slots: SlotInfo[];
}

interface MonthCalendarProps {
  selectedDate: string; // "yyyy-MM-dd"
  selectedSlotId: string;
  onSelectDate: (date: string) => void;
  onSelectSlot: (slotId: string) => void;
}

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function getDayColor(available: number, max: number) {
  if (available === 0) return "unavailable";
  if (available <= max * 0.25) return "almost-full";
  if (available <= max * 0.6) return "partial";
  return "available";
}

export function MonthCalendar({
  selectedDate, selectedSlotId, onSelectDate, onSelectSlot,
}: MonthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAvailability = useCallback(async (month: Date) => {
    setLoading(true);
    try {
      const monthStr = format(month, "yyyy-MM");
      const res = await fetch(`/api/availability?month=${monthStr}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailability(currentMonth);
  }, [currentMonth, fetchAvailability]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // Monday-first padding
  const firstDayOfWeek = (getDay(days[0]) + 6) % 7; // 0=Mon
  const today = startOfDay(new Date());

  const selectedDayData = selectedDate ? data?.availability[selectedDate] : null;

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrentMonth(m => subMonths(m, 1))}
          disabled={isBefore(endOfMonth(subMonths(currentMonth, 1)), today)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/20 text-white hover:border-[#1bbfa8] hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="font-bold text-white capitalize text-base">
          {format(currentMonth, "MMMM yyyy", { locale: fr })}
        </h3>
        <button
          type="button"
          onClick={() => setCurrentMonth(m => addMonths(m, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/20 text-white hover:border-[#1bbfa8] hover:bg-white/10 transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-white/60 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#1bbfa8] inline-block" />Disponible</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400 inline-block" />Presque complet</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white/20 inline-block" />Complet</span>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/5">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-white/10 border-b border-white/10">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-white/60 py-2">{d}</div>
          ))}
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          </div>
        )}

        {!loading && data && (
          <div className="grid grid-cols-7">
            {/* Padding for first week */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`pad-${i}`} className="h-14 border-r border-b border-white/10 last:border-r-0" />
            ))}

            {days.map((day, idx) => {
              const dayStr = format(day, "yyyy-MM-dd");
              const isPast = isBefore(day, today);
              const isSelected = selectedDate === dayStr;
              const dayData = data.availability[dayStr];
              const maxPerSlot = data.maxPerSlot;
              const totalSlots = data.slots.length;
              const maxTotal = maxPerSlot * totalSlots;
              const colorType = isPast || !dayData
                ? "past"
                : getDayColor(dayData.totalAvailable, maxTotal);
              const isColEnd = (firstDayOfWeek + idx + 1) % 7 === 0;

              return (
                <button
                  key={dayStr}
                  type="button"
                  disabled={isPast || colorType === "unavailable"}
                  onClick={() => {
                    onSelectDate(dayStr);
                    onSelectSlot(""); // reset slot on date change
                  }}
                  className={cn(
                    "relative h-14 flex flex-col items-center justify-center border-b border-white/10 transition-all",
                    !isColEnd && "border-r",
                    isPast && "opacity-30 cursor-not-allowed bg-white/5",
                    !isPast && colorType === "unavailable" && "bg-white/5 cursor-not-allowed",
                    !isPast && colorType !== "unavailable" && "hover:bg-white/10 cursor-pointer",
                    isSelected && "bg-emerald-600 hover:bg-emerald-600 ring-2 ring-inset ring-emerald-400",
                    isToday(day) && !isSelected && "ring-2 ring-inset ring-blue-300"
                  )}
                >
                  <span className={cn(
                    "text-sm font-semibold",
                    isSelected ? "text-white" : isPast ? "text-white/30" : "text-white"
                  )}>
                    {format(day, "d")}
                  </span>

                  {/* Availability dots */}
                  {!isPast && dayData && (
                    <div className="flex gap-0.5 mt-0.5">
                      {colorType === "unavailable" ? (
                        <span className="text-[9px] text-white/40">complet</span>
                      ) : (
                        <>
                          <span className={cn(
                            "text-[9px] font-medium",
                            isSelected ? "text-emerald-100" :
                            colorType === "almost-full" ? "text-amber-600" :
                            colorType === "partial" ? "text-orange-500" :
                            "text-emerald-600"
                          )}>
                            {dayData.totalAvailable} pl.
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Slot picker — shown after date selection */}
      {selectedDate && selectedDayData && data && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-sm font-semibold text-white">
            Créneaux disponibles le{" "}
            <span className="text-[#1bbfa8] capitalize">
              {format(new Date(selectedDate + "T12:00:00"), "EEEE d MMMM", { locale: fr })}
            </span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {data.slots.map(slot => {
              const slotData = selectedDayData.slots[slot.id];
              const available = slotData?.available ?? data.maxPerSlot;
              const isFull = available === 0;
              const isSlotSelected = selectedSlotId === slot.id;

              // Filter past slots on today: parse start hour from slot.time (e.g. "09:00-12:00")
              const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");
              let isPastSlot = false;
              if (isToday) {
                const startHour = parseInt(slot.time.split(":")[0] ?? "0", 10);
                const startMin = parseInt(slot.time.split(":")[1]?.split("-")[0] ?? "0", 10);
                const now = new Date();
                const slotStart = new Date();
                slotStart.setHours(startHour, startMin, 0, 0);
                isPastSlot = now >= slotStart;
              }

              const isDisabled = isFull || isPastSlot;

              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && onSelectSlot(slot.id)}
                  className={cn(
                    "flex flex-col items-center py-3 px-4 rounded-xl border-2 font-medium transition-all",
                    isDisabled && "border-white/10 bg-white/5 text-white/30 cursor-not-allowed",
                    !isDisabled && !isSlotSelected && "border-white/20 bg-white/10 text-white hover:border-[#1bbfa8] hover:bg-white/20",
                    isSlotSelected && "border-emerald-500 bg-emerald-600 text-white shadow-md"
                  )}
                >
                  <span className="font-bold text-base">{slot.time}</span>
                  <span className={cn(
                    "text-xs mt-1",
                    isPastSlot ? "text-gray-300" :
                    isFull ? "text-gray-300" :
                    isSlotSelected ? "text-emerald-100" :
                    available <= 2 ? "text-amber-400 font-semibold" : "text-white/50"
                  )}>
                    {isPastSlot ? "Passé" : isFull ? "Complet" : `${available}/${data.maxPerSlot} place${available > 1 ? "s" : ""}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
