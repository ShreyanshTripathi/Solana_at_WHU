"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

const clock = (hour: number) =>
  `${String(Math.floor(hour) % 24).padStart(2, "0")}:${String(Math.round((hour % 1) * 60)).padStart(2, "0")}`;

// The demo's length: how many sunny hours to simulate, with the stretch of the day they cover.
// Submitted with the surrounding form as `hours`.
export function DemoLength({
  startHour,
  min,
  max,
  initial,
}: {
  startHour: number;
  min: number;
  max: number;
  initial: number;
}) {
  const { m } = useI18n();
  const [hours, setHours] = useState(initial);
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="opacity-70">{m.demo.length}</span>
      <input
        type="range"
        name="hours"
        min={min}
        max={max}
        step={1}
        value={hours}
        onChange={(e) => setHours(Number(e.target.value))}
        className="w-28 accent-blue-600"
      />
      <span className="whitespace-nowrap tabular-nums">
        <b>{m.demo.hours(hours)}</b>{" "}
        <span className="opacity-60">
          {clock(startHour)}–{clock(startHour + hours)}
        </span>
      </span>
    </label>
  );
}
