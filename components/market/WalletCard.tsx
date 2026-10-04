import { approveAgentLimit, approveWalletSpending, revokeWalletSpending, topUpWallet } from "@/app/buyer/actions";
import type { LimitSuggestion } from "@/lib/agents/spending";
import type { Format } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import type { WalletStatus } from "@/lib/solana/p2p";
import { explorerAddressUrl } from "@/lib/solana/wallets";
import { OwnWalletActions } from "./OwnWalletActions";

const input = "mt-1 block w-28 rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20";
const button = "rounded border border-black/15 px-3 py-1 dark:border-white/20";

// Peer-to-peer mode (1a): the buyer's wallet, the spending limit they approved for Volty's
// settlement key, and (for demo wallets) buttons to top up, approve and revoke.
export function WalletCard(props: {
  m: Messages;
  f: Format;
  wallet: string | null;
  status: WalletStatus | null;
  canAct: boolean; // the viewer's own workspace, with a demo wallet the server can sign for
  ownWallet: boolean; // the viewer's own workspace
  suggestion: LimitSuggestion | null; // the payment agent's suggested monthly limit
  privyEnabled: boolean; // members can sign with their own (Privy) wallet in the browser
}) {
  const { m, f, wallet, status, canAct, ownWallet, suggestion, privyEnabled } = props;
  const t = m.wallet;
  const eur = (micro: number) => f.eur(micro / 1_000_000);
  return (
    <section className="mt-4 rounded-lg border border-blue-600/30 p-4">
      <h2 className="font-semibold">{t.title}</h2>
      <p className="mt-1 text-xs opacity-70">{t.intro}</p>
      {!status ? (
        <p className="mt-3 text-sm opacity-70">{t.unavailable}</p>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs opacity-70">{t.balance}</dt>
            <dd className="text-lg font-semibold tabular-nums">{eur(status.balanceMicro)}</dd>
          </div>
          <div>
            <dt className="text-xs opacity-70">{t.approved}</dt>
            <dd className="text-lg font-semibold tabular-nums">{status.approvedMicro > 0 ? eur(status.approvedMicro) : t.notApproved}</dd>
          </div>
          {wallet && (
            <div>
              <dt className="text-xs opacity-70">Wallet</dt>
              <dd>
                <a href={explorerAddressUrl(wallet)} target="_blank" rel="noreferrer" className="font-mono text-xs text-blue-700 underline dark:text-blue-400">
                  {wallet.slice(0, 4)}…{wallet.slice(-4)} ↗
                </a>
              </dd>
            </div>
          )}
        </dl>
      )}
      {suggestion && (
        <div className="mt-3 rounded-md bg-blue-600/5 p-3 text-sm">
          <p className="font-medium">{t.agentTitle}</p>
          <p className="mt-0.5 text-xs opacity-80">
            {t.agentSuggests(f.kwh(suggestion.dailyKwh, 2), f.ct(suggestion.priceCt), f.eur(suggestion.needEur), f.eur(suggestion.limitEur, 0))}
          </p>
          {ownWallet && canAct && (
            <form action={approveAgentLimit} className="mt-2">
              <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-white">
                {t.agentApply(f.eur(suggestion.limitEur, 0))}
              </button>
            </form>
          )}
        </div>
      )}
      {ownWallet && canAct && (
        <div className="mt-3 flex flex-wrap items-end gap-3 text-sm">
          <form action={topUpWallet}>
            <input type="hidden" name="amountEur" value="25" />
            <button type="submit" className={button}>
              {t.topUp}
            </button>
          </form>
          <form action={approveWalletSpending} className="flex items-end gap-2">
            <label className="block">
              <span className="text-xs opacity-70">{t.limit}</span>
              <input type="number" name="limitEur" min={1} max={500} step={1} defaultValue={30} className={input} />
            </label>
            <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-white">
              {t.approve}
            </button>
          </form>
          {status && status.approvedMicro > 0 && (
            <form action={revokeWalletSpending}>
              <button type="submit" className={button}>
                {t.revoke}
              </button>
            </form>
          )}
          <p className="w-full text-xs opacity-60">{t.demoNote}</p>
        </div>
      )}
      {ownWallet && !canAct && wallet && privyEnabled ? (
        <OwnWalletActions wallet={wallet} approved={(status?.approvedMicro ?? 0) > 0} suggestedEur={suggestion?.limitEur ?? null} />
      ) : (
        ownWallet && !canAct && <p className="mt-3 text-xs opacity-70">{t.realWallet}</p>
      )}
    </section>
  );
}
