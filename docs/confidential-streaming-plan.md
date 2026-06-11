# StreamLine Confidential Streaming — Design (Twisted ElGamal)

> Status: **DESIGN ONLY** — no code yet. This adapts the confidentiality
> *mechanism* from MystenLabs/confidential-transfers (`contra`, Apache-2.0) to
> hide **stream amounts**. It is a serious cryptographic build, not a quick
> change; treated as the amount-privacy roadmap alongside [`privacy-seal-plan.md`](./privacy-seal-plan.md)
> (which hides *metadata*).

## Why amounts are hard

StreamLine's headline features fight amount privacy:
- The permissionless **keeper** settles drips and must compute accrual.
- **Gasless Address Balances** are *public* stablecoin transfers — the moment
  value moves as a normal `Coin<T>` transfer, the amount is visible.

So hiding amounts means value must move inside a **confidential-balance** system,
and the keeper must be able to advance it **without holding a secret key**.

## The mechanism we borrow (from `contra`)

**Twisted ElGamal over Ristretto255** (`twisted_elgamal.move`). Encrypt value `m`
under public key `pk` with randomness `r`:

```
ciphertext         c = r·g + m·h
decryption handle  d = r·pk
```

Three properties we exploit:

1. **Additively homomorphic** — `add`/`sub` are point ops on the pair, so two
   *encrypted* balances combine with **no secret key**.
2. **Public scalar multiply** — `Enc(m) · k = Enc(m·k)` for a **public** scalar
   `k` (their `shift_left` / `g_mul`). Also `add_assign_u64` folds a public
   amount into a ciphertext.
3. **Decryptable but bounded** — amounts split into 4×`u16` limbs (`l0..l3`) so
   the owner solves the discrete log per limb (baby-step/giant-step).

**Soundness** rides on ZK proofs carried in each tx (`encrypted_amount.move`,
`nizk.move`): Bulletproof **range proofs** (`sui::rangeproofs`) per limb,
**consistency** ElGamal proofs binding the limbs, **DDH** proofs for handle
correctness. Conservation on transfer = sum of commitments must match
(`EMismatchedTransferTotal`).

**Solvency** (`balance.move`): real coins sit in a shared **`Pool`** as a public
reserve (`PublicCoin`); *who owns how much* is the `EncryptedBalance`. `wrap`
deposits to the pool + credits the encrypted balance; `unwrap` proves + withdraws.
They use `send_funds`/`redeem_funds` — **Address Balances**, same gasless
primitive StreamLine uses.

## The key insight for streaming

Accrual is `rate × elapsed_time`, and **`elapsed_time` is public**. So:

```
Enc(accrued) = Enc(rate) · elapsed          // scalar-mul by a PUBLIC value
```

The keeper computes the encrypted accrued amount **without ever seeing the rate
or the amount** — the only secret (`rate`) stays encrypted, the multiplier is
public. Then homomorphically **subtract** `Enc(accrued)` from the stream's
encrypted remaining and **add** it to the freelancer's encrypted balance — again
no key required. This gives the permissionless-keeper property for free.

## Confidential `Stream` layout

| StreamLine today | Confidential version |
|---|---|
| `balance: Balance<T>` | public `Pool` reserve + `EncryptedBalance<T>` (remaining), encrypted under the **freelancer's** pk |
| `rate_per_ms: u64` (public) | `Enc(rate)` (encrypted) |
| `milestones: vector<{name, amount}>` | amounts as encrypted limbs; `name` already handled by Seal |
| `drip()` pays `total·elapsed/duration` | keeper: `Enc(accrued) = Enc(rate)·elapsed`, homomorphic move pool-side |
| freelancer wallet credited | freelancer's `EncryptedBalance` grows; decrypt locally, `unwrap` to cash out |

Milestone **state** (LOCKED / PENDING_REVIEW / DRIPPING / PAUSED / DONE),
approval, auto-approve, and dispute logic are **unchanged** — they gate on state,
not amounts.

## Settlement flow — the pre-proven schedule

The central problem: a range proof ("remaining ≥ 0 after this drip") needs the
secret opening, which the **keeper does not have**. Two resolutions:

- **(A) Pre-proven drip schedule (recommended).** At `create_stream`, the client
  (who knows the amounts) generates the encrypted increments **and their range +
  consistency proofs** for the whole schedule, stored on-chain. The keeper, when
  an interval is due, submits the next pre-proven step — preserving permissionless
  *timing* while keeping amounts hidden. Disputes/early-cancel truncate the
  remaining schedule.
- **(B) Milestone-granular reveal.** Prove each milestone's total once; intra-
  milestone drips ride a public conservative `upper_bound` (as `contra` does).
  Much less proving, weaker privacy (per-milestone totals leak).

Recommend **(A)** for true amount privacy; **(B)** as a cheaper fallback.

## Honest limitations

1. **Range proofs need the secret** → keeper can't generate them → schedule must
   be pre-proven (A) or amounts revealed per milestone (B).
2. **Limb re-decomposition** — `rate·elapsed` can overflow a `u16` limb, so the
   accrued amount must be re-split into limbs and re-proven; not a single multiply.
3. **Cash-out reveals** — `unwrap` to spendable USDC exposes *that* amount unless
   the freelancer keeps spending confidentially.
4. **Composability cost** — Scallop/NAVI can't read an encrypted balance, so
   escrow-yield and stream collateral need a plaintext path or are unavailable
   under confidentiality.
5. **Source maturity** — `contra` is **devnet, unaudited, WIP** ("not for
   production"). We reuse the *mechanism/design*, not the package, and would
   re-implement against `sui::ristretto255` / `sui::rangeproofs` / `sui::group_ops`.
6. **Not gasless end-to-end** — confidential-transfer txs write objects, so they
   don't qualify for gasless Address Balances (only the pool wrap/unwrap boundary
   does).

## Build order (when prioritised)

1. Prove the accrual identity off-chain: `Enc(rate)·elapsed` decrypts to the
   expected accrued amount across limbs (Rust/TS prototype).
2. Minimal Move: `EncryptedBalance`, `Pool`, wrap/unwrap, homomorphic add/sub —
   re-implemented from `contra` against Sui natives.
3. Pre-proven schedule generator (client-side, TS) + on-chain verifier step.
4. Wire into a `confidential` variant of `create_stream` / `drip`; keep the
   public path as default.

## References

- MystenLabs/confidential-transfers (Apache-2.0): `move/sources/twisted_elgamal.move`,
  `encrypted_amount.move`, `balance.move`, `nizk.move`, `contra.move`.
- Sui natives: `sui::ristretto255`, `sui::group_ops`, `sui::rangeproofs` (Bulletproofs).
- Companion: [`privacy-seal-plan.md`](./privacy-seal-plan.md) (metadata privacy via Seal).
