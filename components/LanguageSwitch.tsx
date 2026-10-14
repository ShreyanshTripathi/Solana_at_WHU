"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/app/i18n/actions";
import { LOCALES } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";

// DE | EN in the navigation. Saves the choice, then re-renders the current page in that language.
export function LanguageSwitch({ dark = false }: { dark?: boolean }) {
  const { locale, m } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <span
      role="group"
      aria-label={m.common.language}
      className={`inline-flex w-fit rounded-full p-0.5 text-xs ${dark ? "bg-white/10 ring-1 ring-white/15" : "bg-[#f4f4f1]"}`}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          disabled={pending}
          aria-pressed={l === locale}
          onClick={() =>
            startTransition(async () => {
              await setLocale(l);
              router.refresh();
            })
          }
          className={`rounded-full px-2.5 py-1 uppercase aria-pressed:bg-white aria-pressed:font-semibold aria-pressed:text-[#111111] aria-pressed:shadow-[0_1px_2px_rgba(0,0,0,0.08)] ${dark ? "text-white/60 hover:text-white" : "text-[#5c5c57]"}`}
        >
          {l}
        </button>
      ))}
    </span>
  );
}
