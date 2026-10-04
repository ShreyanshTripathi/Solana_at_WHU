# roof-split: Solar Now, Pay Never on-chain

A native Solana program (no framework) that every payment to a funded roof goes through. It stores each
roof's terms on-chain: fee, reserve until full, the investors' share until they are repaid with their
return, and the host's rest. It splits each payment straight from the payer's token account to every
party. It holds no money, and nobody, Volty included, can pay a roof's investors differently. The
maths is the same as `splitProjectSale` in `lib/ledger/ledger.ts`; `tests/roof-split.test.ts` and the
Rust tests below check the same cases.

- **Devnet program id:** `GHnjmVm6xAnnpJ2UpWaJ3ejHSGX2cf3fwoRQToMGvQRh`
- **Roof account:** PDA `["roof", stadtwerk, project id]`, registered automatically the first time a roof is paid on-chain (`lib/settlement/roofs.ts`).
- **Instructions:** `0 InitRoof` (the Stadtwerk, once per roof) and `1 Pay` (a list of sales; the payer signs as the owner or the approved delegate of the source account, so a buyer's spending limit applies).
- **Client:** `lib/solana/roofSplit.ts`.

## Build, test, deploy

Needs Rust 1.85 or newer (current dependencies use the 2024 edition) and the Solana CLI (`sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"`).

```sh
cd programs/roof-split
cargo test                     # the waterfall, on the host
cargo build-sbf                # target/deploy/kiezwatt_roof_split.so
cp target/deploy/kiezwatt_roof_split-keypair.json ../../data/keys/roof-split-program.json
solana program deploy target/deploy/kiezwatt_roof_split.so \
  --program-id ../../data/keys/roof-split-program.json \
  --keypair ../../data/keys/stadtwerk.json --url devnet
```

The app finds the program id from `data/keys/roof-split-program.json` (or `ROOF_SPLIT_PROGRAM_ID`).
`ROOF_ID_PREFIX` gives test runs on database copies their own roof accounts.

The Stadtwerk's key is the program's upgrade authority on devnet. In production the program would be
made immutable (`solana program set-upgrade-authority <id> --final`) once audited, so the split can't
be changed either.
