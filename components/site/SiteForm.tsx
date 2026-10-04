"use client";

import { useActionState } from "react";
import { registerSiteAction, type SiteFormState } from "@/app/site/actions";
import { useI18n } from "@/lib/i18n/client";

const input = "mt-1 block w-full rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20";

function Field(props: { name: string; label: string; hint?: string; value?: string; type?: string; step?: string; className?: string }) {
  return (
    <label className={`block ${props.className ?? ""}`}>
      <span className="text-xs opacity-70">{props.label}</span>
      <input
        name={props.name}
        type={props.type ?? "text"}
        step={props.step}
        min={props.type === "number" ? 0 : undefined}
        defaultValue={props.value}
        required
        className={input}
      />
      {props.hint && <span className="mt-0.5 block text-xs opacity-60">{props.hint}</span>}
    </label>
  );
}

export function SiteForm({ defaultAnnualKwh }: { defaultAnnualKwh: number }) {
  const [state, action, pending] = useActionState<SiteFormState, FormData>(registerSiteAction, {});
  const { m } = useI18n();
  const t = m.site.form;
  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-4 text-sm">
      <fieldset className="grid gap-3 sm:grid-cols-6">
        <legend className="mb-2 font-medium">{t.address}</legend>
        <Field name="street" label={t.street} value={v.street} className="sm:col-span-3" />
        <Field name="postcode" label={t.postcode} value={v.postcode} className="sm:col-span-1" />
        <Field name="city" label={t.city} value={v.city} className="sm:col-span-2" />
      </fieldset>
      <Field
        name="meterId"
        label={t.meterId}
        hint={t.meterHint}
        value={v.meterId}
      />
      <fieldset className="grid gap-3 sm:grid-cols-4">
        <legend className="mb-2 font-medium">{t.assets}</legend>
        <Field name="pvKwp" label={t.pv} type="number" step="0.1" value={v.pvKwp ?? "0"} hint={t.zeroIfNone} />
        <Field name="batteryKwh" label={t.battery} type="number" step="0.1" value={v.batteryKwh ?? "0"} hint={t.zeroIfNone} />
        <Field name="evChargerKw" label={t.ev} type="number" step="0.1" value={v.evChargerKw ?? "0"} hint={t.evHint} />
        <Field name="annualKwh" label={t.use} type="number" step="100" value={v.annualKwh ?? String(defaultAnnualKwh)} hint={t.useHint} />
      </fieldset>
      {state.errors && (
        <ul role="alert" className="list-disc pl-5 text-red-700 dark:text-red-400">
          {state.errors.map((e) => (
            <li key={e}>{m.site.errors[e] ?? m.site.errors.failed}</li>
          ))}
        </ul>
      )}
      <button type="submit" disabled={pending} className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-60">
        {pending ? t.checking : t.submit}
      </button>
    </form>
  );
}
