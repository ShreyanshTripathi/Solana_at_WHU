"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

type Choice = { memberId: string; name: string };

// How much of a slider's track is filled, for the .v-range style.
const fill = (share: number) =>
  ({ "--fill": `${Math.round(share * 1000) / 10}%` }) as React.CSSProperties;

// FR-REC-09 buying rules: two sliders with their value on the right, and the preferred and blocked
// neighbours as pills with an "Add" menu. A neighbour is on at most one of the two lists. The form
// posts the same fields as before to the server action, which checks them again.
export function BuyingRules(props: {
  action: (formData: FormData) => Promise<void>;
  memberId: string;
  choices: Choice[];
  maxPriceCt: number;
  gridCt: number;
  maxDistanceM: number;
  preferred: string[];
  blocked: string[];
}) {
  const { m, f } = useI18n();
  const t = m.buyer;
  const [price, setPrice] = useState(props.maxPriceCt);
  const [distance, setDistance] = useState(props.maxDistanceM);
  const [preferred, setPreferred] = useState(
    props.preferred.filter((id) => !props.blocked.includes(id)),
  );
  const [blocked, setBlocked] = useState(props.blocked);
  const [adding, setAdding] = useState<"preferred" | "blocked" | null>(null);
  const maxDistance = Math.max(5000, props.maxDistanceM);
  const nameOf = (id: string) =>
    props.choices.find((c) => c.memberId === id)?.name ?? id;

  const add = (list: "preferred" | "blocked", id: string) => {
    if (list === "preferred") {
      setPreferred((p) => [...p, id]);
      setBlocked((b) => b.filter((x) => x !== id));
    } else {
      setBlocked((b) => [...b, id]);
      setPreferred((p) => p.filter((x) => x !== id));
    }
    setAdding(null);
  };
  const remove = (list: "preferred" | "blocked", id: string) =>
    (list === "preferred" ? setPreferred : setBlocked)((l) =>
      l.filter((x) => x !== id),
    );

  const slider = (label: string, value: string, input: React.ReactNode) => (
    <label className="block">
      <span className="flex items-baseline justify-between gap-4">
        <span className="text-[#5c5c57]">{label}</span>
        <span className="font-mono text-[13px] font-semibold text-[#111111] tabular-nums">
          {value}
        </span>
      </span>
      {input}
    </label>
  );

  const pills = (
    list: "preferred" | "blocked",
    label: string,
    ids: string[],
  ) => {
    const available = props.choices.filter((c) => !ids.includes(c.memberId));
    return (
      <fieldset>
        <legend className="text-[#5c5c57]">{label}</legend>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {ids.length === 0 && adding !== list && (
            <span className="text-[#9a9a94]">{t.nobody}</span>
          )}
          {ids.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#111111] py-1.5 pl-3.5 pr-2 font-medium text-white"
            >
              <input type="hidden" name={list} value={id} />
              {nameOf(id)}
              <button
                type="button"
                onClick={() => remove(list, id)}
                aria-label={t.removeNeighbour(nameOf(id))}
                className="grid h-4 w-4 place-items-center rounded-full text-white/60 hover:bg-white/15 hover:text-white"
              >
                ×
              </button>
            </span>
          ))}
          <span className="relative">
            <button
              type="button"
              onClick={() => setAdding(adding === list ? null : list)}
              aria-expanded={adding === list}
              className="rounded-full border border-dashed border-[#c9c8c1] px-3.5 py-1.5 text-[#5c5c57] hover:border-[#111111] hover:text-[#111111]"
            >
              + {t.addNeighbour}
            </button>
            {adding === list && (
              <ul className="absolute left-0 top-full z-20 mt-1.5 min-w-48 rounded-xl border border-black/5 bg-white p-1 shadow-[0_12px_30px_-12px_rgba(17,17,17,0.25)]">
                {available.length === 0 ? (
                  <li className="px-3 py-2 text-[#7a7a75]">
                    {t.noMoreNeighbours}
                  </li>
                ) : (
                  available.map((c) => (
                    <li key={c.memberId}>
                      <button
                        type="button"
                        onClick={() => add(list, c.memberId)}
                        className="w-full rounded-lg px-3 py-2 text-left hover:bg-[#f4f4f1]"
                      >
                        {c.name}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </span>
        </div>
      </fieldset>
    );
  };

  return (
    <form action={props.action} className="mt-4 max-w-lg space-y-5 text-sm">
      <input type="hidden" name="memberId" value={props.memberId} />
      {slider(
        t.maxPrice,
        `${f.num(price, price % 1 ? 1 : 0)} ct/kWh`,
        <input
          type="range"
          name="maxPriceCt"
          min={0}
          max={props.gridCt}
          step={0.5}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="v-range mt-2"
          style={fill(price / props.gridCt)}
        />,
      )}
      {slider(
        t.maxDistance,
        `${f.num(distance, 0)} m`,
        <input
          type="range"
          name="maxDistanceM"
          min={100}
          max={maxDistance}
          step={100}
          value={distance}
          onChange={(e) => setDistance(Number(e.target.value))}
          className="v-range mt-2"
          style={fill((distance - 100) / (maxDistance - 100))}
        />,
      )}
      {pills("preferred", t.prefer, preferred)}
      {pills("blocked", t.never, blocked)}
      <div className="pt-1">
        <button type="submit" className="v-btn">
          {m.common.saveRules}
        </button>
        <p className="mt-3 text-xs text-[#7a7a75]">{t.rulesNote}</p>
      </div>
    </form>
  );
}
