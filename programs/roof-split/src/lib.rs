//! KiezWatt roof split: every payment to a Solar Now, Pay Never roof goes through this program, which
//! splits it by the roof's terms, stored on-chain: the platform fee, then the maintenance reserve until
//! it is full, then the investors (pro rata to what they invested) until they are repaid with their
//! return, and the rest to the host. The payer's tokens go straight to each party; the program holds
//! no money, and nobody, KiezWatt included, can pay a roof's investors differently.
//!
//! Instructions (first byte):
//!   0 InitRoof: the Stadtwerk registers a funded roof with its terms and payees.
//!   1 Pay: a payer (a buyer's wallet, or the settlement key as the buyer's approved delegate, or the
//!     Stadtwerk's treasury) pays a list of sales to the roof; each sale is split in order.
//!
//! The arithmetic mirrors `splitProjectSale` in lib/ledger/ledger.ts exactly (floors, caps, the last
//! investor takes the rounding remainder), so the ledger and the chain agree to the micro-euro.

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    instruction::{AccountMeta, Instruction},
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};

#[cfg(not(feature = "no-entrypoint"))]
solana_program::entrypoint!(process_instruction);

pub const TOKEN_PROGRAM_ID: Pubkey = solana_program::pubkey!("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
pub const MAX_INVESTORS: usize = 8;
pub const MAX_SALES: usize = 32;
const VERSION: u8 = 1;

// Account layout (little-endian), fixed size.
const O_VERSION: usize = 0;
const O_BUMP: usize = 1;
const O_AUTHORITY: usize = 2;
const O_MINT: usize = 34;
const O_FEE_BPS: usize = 66;
const O_RESERVE_BPS: usize = 68;
const O_INVESTOR_BPS: usize = 70;
const O_OWED: usize = 72;
const O_REPAID: usize = 80;
const O_RESERVE: usize = 88;
const O_RESERVE_TARGET: usize = 96;
const O_FEE_ACCOUNT: usize = 104;
const O_RESERVE_ACCOUNT: usize = 136;
const O_HOST_ACCOUNT: usize = 168;
const O_N_INVESTORS: usize = 200;
const O_INVESTORS: usize = 201; // MAX_INVESTORS x (token account [32], weight u64)
const INVESTOR_SIZE: usize = 40;
const O_ROOF_ID: usize = O_INVESTORS + MAX_INVESTORS * INVESTOR_SIZE; // len u8 + 32 bytes
pub const ROOF_SIZE: usize = O_ROOF_ID + 1 + 32;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Terms {
    pub fee_bps: u16,
    pub reserve_bps: u16,
    pub investor_share_bps: u16,
    pub owed_total: u64,
    pub repaid: u64,
    pub reserve: u64,
    pub reserve_target: u64,
}

/// What one batch of sales pays each party, and the roof's state afterwards.
#[derive(Debug, PartialEq)]
pub struct Split {
    pub fee: u64,
    pub reserve: u64,
    pub investors: Vec<u64>,
    pub host: u64,
    pub terms_after: Terms,
}

fn bps(amount: u64, basis_points: u16) -> u64 {
    ((amount as u128 * basis_points as u128) / 10_000) as u64
}

/// The waterfall for a list of sales, applied one sale at a time (pure, unit-tested).
pub fn split_sales(terms: Terms, weights: &[u64], sales: &[u64]) -> Split {
    let mut t = terms;
    let mut out = Split { fee: 0, reserve: 0, investors: vec![0; weights.len()], host: 0, terms_after: terms };
    let total_weight: u128 = weights.iter().map(|w| *w as u128).sum();
    for &amount in sales {
        let fee = bps(amount, t.fee_bps);
        let reserve = bps(amount, t.reserve_bps).min(t.reserve_target.saturating_sub(t.reserve));
        let pool = bps(amount, t.investor_share_bps).min(t.owed_total.saturating_sub(t.repaid));
        let mut paid = 0u64;
        for (i, w) in weights.iter().enumerate() {
            let share = if i == weights.len() - 1 {
                pool - paid
            } else if total_weight == 0 {
                0
            } else {
                ((pool as u128 * *w as u128) / total_weight) as u64
            };
            paid += share;
            out.investors[i] += share;
        }
        out.fee += fee;
        out.reserve += reserve;
        out.host += amount - fee - reserve - paid;
        t.reserve += reserve;
        t.repaid += paid;
    }
    out.terms_after = t;
    out
}

fn read_u16(d: &[u8], o: usize) -> u16 {
    u16::from_le_bytes(d[o..o + 2].try_into().unwrap())
}
fn read_u64(d: &[u8], o: usize) -> u64 {
    u64::from_le_bytes(d[o..o + 8].try_into().unwrap())
}
fn read_key(d: &[u8], o: usize) -> Pubkey {
    Pubkey::new_from_array(d[o..o + 32].try_into().unwrap())
}

struct Reader<'a> {
    data: &'a [u8],
    at: usize,
}
impl<'a> Reader<'a> {
    fn take(&mut self, n: usize) -> Result<&'a [u8], ProgramError> {
        let s = self.data.get(self.at..self.at + n).ok_or(ProgramError::InvalidInstructionData)?;
        self.at += n;
        Ok(s)
    }
    fn u8(&mut self) -> Result<u8, ProgramError> {
        Ok(self.take(1)?[0])
    }
    fn u16(&mut self) -> Result<u16, ProgramError> {
        Ok(u16::from_le_bytes(self.take(2)?.try_into().unwrap()))
    }
    fn u64(&mut self) -> Result<u64, ProgramError> {
        Ok(u64::from_le_bytes(self.take(8)?.try_into().unwrap()))
    }
}

pub fn process_instruction(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let mut r = Reader { data, at: 0 };
    match r.u8()? {
        0 => init_roof(program_id, accounts, &mut r),
        1 => pay(program_id, accounts, &mut r),
        _ => Err(ProgramError::InvalidInstructionData),
    }
}

// A token account's mint (SPL token layout: mint is the first 32 bytes).
fn token_mint(account: &AccountInfo) -> Result<Pubkey, ProgramError> {
    if account.owner != &TOKEN_PROGRAM_ID {
        return Err(ProgramError::IncorrectProgramId);
    }
    let d = account.try_borrow_data()?;
    if d.len() < 165 {
        return Err(ProgramError::InvalidAccountData);
    }
    Ok(read_key(&d, 0))
}

fn init_roof(program_id: &Pubkey, accounts: &[AccountInfo], r: &mut Reader) -> ProgramResult {
    let it = &mut accounts.iter();
    let authority = next_account_info(it)?;
    let roof = next_account_info(it)?;
    let system = next_account_info(it)?;
    let mint = next_account_info(it)?;
    let fee_account = next_account_info(it)?;
    let reserve_account = next_account_info(it)?;
    let host_account = next_account_info(it)?;
    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let id_len = r.u8()? as usize;
    if id_len == 0 || id_len > 32 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let roof_id = r.take(id_len)?;
    let terms = Terms {
        fee_bps: r.u16()?,
        reserve_bps: r.u16()?,
        investor_share_bps: r.u16()?,
        owed_total: r.u64()?,
        repaid: r.u64()?,
        reserve: r.u64()?,
        reserve_target: r.u64()?,
    };
    if terms.fee_bps as u32 + terms.reserve_bps as u32 + terms.investor_share_bps as u32 > 10_000 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let n = r.u8()? as usize;
    if n == 0 || n > MAX_INVESTORS {
        return Err(ProgramError::InvalidInstructionData);
    }
    let mut investors = Vec::with_capacity(n);
    for _ in 0..n {
        let account = next_account_info(it)?;
        investors.push((account, r.u64()?));
    }

    for a in [fee_account, reserve_account, host_account].into_iter().chain(investors.iter().map(|(a, _)| *a)) {
        if token_mint(a)? != *mint.key {
            return Err(ProgramError::InvalidAccountData);
        }
    }

    let (expected, bump) = Pubkey::find_program_address(&[b"roof", authority.key.as_ref(), roof_id], program_id);
    if expected != *roof.key {
        return Err(ProgramError::InvalidSeeds);
    }
    if roof.owner == program_id {
        return Err(ProgramError::AccountAlreadyInitialized);
    }
    invoke_signed(
        &system_instruction::create_account(authority.key, roof.key, Rent::get()?.minimum_balance(ROOF_SIZE), ROOF_SIZE as u64, program_id),
        &[authority.clone(), roof.clone(), system.clone()],
        &[&[b"roof", authority.key.as_ref(), roof_id, &[bump]]],
    )?;

    let mut d = roof.try_borrow_mut_data()?;
    d[O_VERSION] = VERSION;
    d[O_BUMP] = bump;
    d[O_AUTHORITY..O_AUTHORITY + 32].copy_from_slice(authority.key.as_ref());
    d[O_MINT..O_MINT + 32].copy_from_slice(mint.key.as_ref());
    d[O_FEE_BPS..O_FEE_BPS + 2].copy_from_slice(&terms.fee_bps.to_le_bytes());
    d[O_RESERVE_BPS..O_RESERVE_BPS + 2].copy_from_slice(&terms.reserve_bps.to_le_bytes());
    d[O_INVESTOR_BPS..O_INVESTOR_BPS + 2].copy_from_slice(&terms.investor_share_bps.to_le_bytes());
    d[O_OWED..O_OWED + 8].copy_from_slice(&terms.owed_total.to_le_bytes());
    d[O_REPAID..O_REPAID + 8].copy_from_slice(&terms.repaid.to_le_bytes());
    d[O_RESERVE..O_RESERVE + 8].copy_from_slice(&terms.reserve.to_le_bytes());
    d[O_RESERVE_TARGET..O_RESERVE_TARGET + 8].copy_from_slice(&terms.reserve_target.to_le_bytes());
    d[O_FEE_ACCOUNT..O_FEE_ACCOUNT + 32].copy_from_slice(fee_account.key.as_ref());
    d[O_RESERVE_ACCOUNT..O_RESERVE_ACCOUNT + 32].copy_from_slice(reserve_account.key.as_ref());
    d[O_HOST_ACCOUNT..O_HOST_ACCOUNT + 32].copy_from_slice(host_account.key.as_ref());
    d[O_N_INVESTORS] = n as u8;
    for (i, (account, weight)) in investors.iter().enumerate() {
        let o = O_INVESTORS + i * INVESTOR_SIZE;
        d[o..o + 32].copy_from_slice(account.key.as_ref());
        d[o + 32..o + 40].copy_from_slice(&weight.to_le_bytes());
    }
    d[O_ROOF_ID] = id_len as u8;
    d[O_ROOF_ID + 1..O_ROOF_ID + 1 + id_len].copy_from_slice(roof_id);
    msg!("KiezWatt roof registered: {} investors", n);
    Ok(())
}

fn transfer_checked<'a>(
    source: &AccountInfo<'a>,
    mint: &AccountInfo<'a>,
    destination: &AccountInfo<'a>,
    authority: &AccountInfo<'a>,
    amount: u64,
    decimals: u8,
) -> ProgramResult {
    if amount == 0 {
        return Ok(());
    }
    let mut data = Vec::with_capacity(10);
    data.push(12); // TransferChecked
    data.extend_from_slice(&amount.to_le_bytes());
    data.push(decimals);
    let ix = Instruction {
        program_id: TOKEN_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(*source.key, false),
            AccountMeta::new_readonly(*mint.key, false),
            AccountMeta::new(*destination.key, false),
            AccountMeta::new_readonly(*authority.key, true),
        ],
        data,
    };
    invoke(&ix, &[source.clone(), mint.clone(), destination.clone(), authority.clone()])
}

fn pay(program_id: &Pubkey, accounts: &[AccountInfo], r: &mut Reader) -> ProgramResult {
    let it = &mut accounts.iter();
    let payer = next_account_info(it)?; // the source's owner or approved delegate
    let source = next_account_info(it)?;
    let roof = next_account_info(it)?;
    let mint = next_account_info(it)?;
    let token_program = next_account_info(it)?;
    let fee_account = next_account_info(it)?;
    let reserve_account = next_account_info(it)?;
    let host_account = next_account_info(it)?;
    if !payer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    if roof.owner != program_id || token_program.key != &TOKEN_PROGRAM_ID {
        return Err(ProgramError::IncorrectProgramId);
    }

    let count = r.u8()? as usize;
    if count == 0 || count > MAX_SALES {
        return Err(ProgramError::InvalidInstructionData);
    }
    let mut sales = Vec::with_capacity(count);
    for _ in 0..count {
        sales.push(r.u64()?);
    }

    let (terms, weights, decimals) = {
        let d = roof.try_borrow_data()?;
        if d.len() != ROOF_SIZE || d[O_VERSION] != VERSION {
            return Err(ProgramError::InvalidAccountData);
        }
        // Payees must be exactly the ones registered for this roof.
        if read_key(&d, O_MINT) != *mint.key
            || read_key(&d, O_FEE_ACCOUNT) != *fee_account.key
            || read_key(&d, O_RESERVE_ACCOUNT) != *reserve_account.key
            || read_key(&d, O_HOST_ACCOUNT) != *host_account.key
        {
            return Err(ProgramError::InvalidAccountData);
        }
        let n = d[O_N_INVESTORS] as usize;
        let mut weights = Vec::with_capacity(n);
        for i in 0..n {
            let o = O_INVESTORS + i * INVESTOR_SIZE;
            weights.push((read_key(&d, o), read_u64(&d, o + 32)));
        }
        let terms = Terms {
            fee_bps: read_u16(&d, O_FEE_BPS),
            reserve_bps: read_u16(&d, O_RESERVE_BPS),
            investor_share_bps: read_u16(&d, O_INVESTOR_BPS),
            owed_total: read_u64(&d, O_OWED),
            repaid: read_u64(&d, O_REPAID),
            reserve: read_u64(&d, O_RESERVE),
            reserve_target: read_u64(&d, O_RESERVE_TARGET),
        };
        let decimals = mint.try_borrow_data()?.get(44).copied().ok_or(ProgramError::InvalidAccountData)?;
        (terms, weights, decimals)
    };

    let mut investor_accounts = Vec::with_capacity(weights.len());
    for (key, _) in &weights {
        let account = next_account_info(it)?;
        if account.key != key {
            return Err(ProgramError::InvalidAccountData);
        }
        investor_accounts.push(account);
    }

    let split = split_sales(terms, &weights.iter().map(|(_, w)| *w).collect::<Vec<_>>(), &sales);
    transfer_checked(source, mint, fee_account, payer, split.fee, decimals)?;
    transfer_checked(source, mint, reserve_account, payer, split.reserve, decimals)?;
    for (account, amount) in investor_accounts.iter().zip(&split.investors) {
        transfer_checked(source, mint, account, payer, *amount, decimals)?;
    }
    transfer_checked(source, mint, host_account, payer, split.host, decimals)?;

    let mut d = roof.try_borrow_mut_data()?;
    d[O_REPAID..O_REPAID + 8].copy_from_slice(&split.terms_after.repaid.to_le_bytes());
    d[O_RESERVE..O_RESERVE + 8].copy_from_slice(&split.terms_after.reserve.to_le_bytes());
    msg!(
        "KiezWatt roof paid: {} sales, fee {}, reserve {}, investors {}, host {}, repaid {}",
        sales.len(),
        split.fee,
        split.reserve,
        split.investors.iter().sum::<u64>(),
        split.host,
        split.terms_after.repaid
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const WEBER: Terms = Terms {
        fee_bps: 300,
        reserve_bps: 500,
        investor_share_bps: 8_500,
        owed_total: 40_250_000_000,
        repaid: 0,
        reserve: 0,
        reserve_target: 1_750_000_000,
    };

    #[test]
    fn splits_a_sale_like_the_ledger() {
        // 1.000 EUR from Weber's roof, investors 20k and 15k: fee 30k, reserve 50k, investors 850k, host 70k.
        let s = split_sales(WEBER, &[20_000, 15_000], &[1_000_000]);
        assert_eq!(s.fee, 30_000);
        assert_eq!(s.reserve, 50_000);
        assert_eq!(s.investors, vec![485_714, 364_286]);
        assert_eq!(s.host, 70_000);
        assert_eq!(s.terms_after.repaid, 850_000);
    }

    #[test]
    fn stops_the_reserve_when_full_and_investors_when_repaid() {
        let nearly = Terms { reserve: 1_749_990_000, repaid: 40_249_900_000, ..WEBER };
        let s = split_sales(nearly, &[1], &[1_000_000, 1_000_000]);
        assert_eq!(s.reserve, 10_000);
        assert_eq!(s.investors, vec![100_000]);
        assert_eq!(s.fee + s.reserve + s.investors[0] + s.host, 2_000_000);
        assert_eq!(s.terms_after.repaid, WEBER.owed_total);
    }

    #[test]
    fn every_unit_is_paid_to_someone() {
        let s = split_sales(WEBER, &[7, 11, 13], &[1, 999, 12_345, 7_777_777]);
        assert_eq!(s.fee + s.reserve + s.investors.iter().sum::<u64>() + s.host, 1 + 999 + 12_345 + 7_777_777);
    }
}
