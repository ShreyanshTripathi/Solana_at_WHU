"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/app/i18n/actions";
import { LOCALES } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";

// DE | EN in the top bar. Saves the choice, then re-renders the current page in that language.
export function LanguageSwitch() {
  const { locale, m } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <span role="group" aria-label={m.common.language} className="flex overflow-hidden rounded-md border border-black/15 text-xs dark:border-white/20">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          disabled={pending}
          aria-pressed={l === locale}
          onClick={() => startTransition(async () => {
            await setLocale(l);
            router.refresh();
          })}
          className="px-2 py-1 uppercase aria-pressed:bg-black/10 aria-pressed:font-semibold dark:aria-pressed:bg-white/15"
        >
          {l}
        </button>
      ))}
    </span>
  );
}
