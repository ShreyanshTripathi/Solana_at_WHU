import { getI18n } from "@/lib/i18n/server";
import { readRoof, roofAddress, roofSplitProgramId } from "@/lib/solana/roofSplit";
import { explorerAddressUrl, getConnection, loadKeypair } from "@/lib/solana/wallets";

// A funded roof as the roof-split program sees it: its terms and what it has paid, read from Solana.
export async function RoofOnChain({ projectId }: { projectId: string }) {
  const { m, f } = await getI18n();
  const t = m.projects.onChain;
  const programId = roofSplitProgramId();
  const treasury = loadKeypair("stadtwerk");
  if (!programId || !treasury) return null;
  const address = roofAddress(programId, treasury.publicKey, projectId);
  let state: Awaited<ReturnType<typeof readRoof>> = null;
  try {
    state = await readRoof(getConnection(), address);
  } catch {
    return <p className="mt-2 text-xs opacity-70">{t.unreachable}</p>;
  }
  const eur = (micro: number) => f.eur(micro / 1_000_000);
  return (
    <p className="mt-2 rounded-md bg-green-600/5 px-3 py-2 text-xs">
      {state ? (
        <>
          <span className="font-medium">{t.title}</span> {t.state(eur(state.repaidMicro), eur(state.owedTotalMicro), eur(state.reserveMicro), state.investors.length)}{" "}
          <a href={explorerAddressUrl(address.toBase58())} target="_blank" rel="noreferrer" className="underline">
            {t.account} ↗
          </a>
        </>
      ) : (
        t.notYet
      )}
    </p>
  );
}
