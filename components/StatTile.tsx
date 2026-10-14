// A headline number on a white card: the label, the big number, and a short line under it.
export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="v-card px-[22px] py-5">
      <p className="text-[13px] text-[#7a7a75]">{label}</p>
      <p className="mt-2 text-[30px] font-semibold leading-tight tracking-[-1.1px] tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-[13px] text-[#7a7a75]">{sub}</p>}
    </div>
  );
}
