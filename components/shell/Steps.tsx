// Progress through joining Volty: account, workspace, your home. Bars fill up to the current step.
export function Steps({ labels, current }: { labels: readonly string[]; current: number }) {
  return (
    <ol aria-label="Steps" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
      {labels.map((label, i) => (
        <li key={label} aria-current={i + 1 === current ? "step" : undefined} className="flex flex-col gap-2">
          <span aria-hidden className={`block h-1 rounded-full ${i + 1 <= current ? "bg-[#111111]" : "bg-[#e3e3de]"}`} />
          <span className={`text-[13px] ${i + 1 === current ? "font-semibold text-[#111111]" : "text-[#9a9a95]"}`}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

// The soft sunrise behind the onboarding pages.
export function OnboardingGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-[-260px] h-[600px] w-[1200px] -translate-x-1/2 blur-[40px]"
      style={{
        background:
          "radial-gradient(closest-side at 35% 50%, rgba(255,178,122,0.35), rgba(255,178,122,0) 70%), radial-gradient(closest-side at 65% 50%, rgba(150,190,255,0.35), rgba(150,190,255,0) 70%)",
      }}
    />
  );
}
