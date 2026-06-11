# Complete Privacy on Testnet — Build Plan

Goal: **all four privacy layers live together on Sui testnet.**

| Layer | Hides | Primitive (testnet-enabled) | Status |
|---|---|---|---|
| Identity | who | zkLogin / Enoki | ✅ shipped |
| Gasless | (UX) | Enoki sponsorship | ✅ shipped |
| Metadata | terms, deliverables | Seal + Walrus | ▢ planned ([seal plan](./privacy-seal-plan.md)) |
| **Amounts** | balances, drip sizes | **Groth16 (`sui::groth16`) + `group_ops`** | 🔨 this doc |

The amounts layer is the hard one. The devnet-only blocker was *Bulletproofs/
ristretto255*; we sidestep it with **Groth16**, whose verifier native
(`sui::groth16::verify_groth16_proof`, BN254/BLS12-381) is enabled on testnet
and mainnet. We re-implement the `contra` confidential-balance design with a
Groth16 proof backend instead of Bulletproofs.

## Toolchain (verified present)

- `sui` 1.73 (testnet, funded address) · `circom` 2.2.3 · node 22 · cargo 1.92
- `snarkjs` — to install (proving + key/proof JSON)
- Groth16 native is available **inside `sui move test`** → we can validate proof
  verification with no deployment and no gas.

## Groth16 Move API (target)

```move
let curve = groth16::bn254();
let pvk = groth16::prepare_verifying_key(&curve, &vk_bytes);
let inputs = groth16::public_proof_inputs_from_bytes(public_inputs_bytes); // 32*n, n≤8
let proof = groth16::proof_points_from_bytes(proof_bytes);
assert!(groth16::verify_groth16_proof(&curve, &pvk, &inputs, &proof));
```

Sui expects arkworks-serialized BN254 bytes (vk split into the 4 PVK fields,
public inputs as 32-byte LE scalars, proof as compressed points). The
snarkjs→Sui conversion is the fiddly part and is validated in Phase 1.

## Phases

### Phase 1 — Prove the pipeline (de-risk everything) 🔨
The whole approach hinges on "can Sui verify our SNARK." Validate with the
**canonical multiplier** circuit (`a*b = c`) — minimal, matches Sui's own
example, so any failure is a format bug not a circuit bug.
1. `privacy/circuits/` workspace; `multiplier.circom`.
2. snarkjs: compile → powers-of-tau → groth16 setup → export vkey → prove.
3. Convert vkey/proof/public to Sui bytes.
4. A `sui move test` embedding the real bytes that asserts `verify == true`.
   **Green test = the entire confidential-amounts path is viable on testnet.**

### Phase 2 — Range proof (the real primitive)
Swap the toy circuit for a **range proof**: prove a private value `v ∈ [0, 2^64)`
via bit decomposition, bound to a Pedersen/ElGamal commitment opening. This is
what prevents over-withdrawing a confidential balance.

### Phase 3 — Confidential balance (Move)
Port the `contra` design onto testnet curves: `EncryptedBalance` (ElGamal over
BN254/BLS12-381 via `group_ops`), a pooled public reserve, `wrap`/`unwrap`,
homomorphic add/sub. Range/consistency enforced by Phase-2 Groth16 proofs.

### Phase 4 — Confidential streaming
Encrypted `Stream`: `Enc(rate)`, `Enc(remaining)`, the `Enc(rate)·elapsed`
accrual, and the **pre-proven drip schedule** (client generates the per-drip
proofs at creation; keyless keeper submits the next when due). Milestone state
stays public.

### Phase 5 — Frontend proving
Browser proving with snarkjs/wasm: generate the schedule proofs on stream
creation; freelancer decrypts their balance locally. Wire into the dashboards.

## Known costs / caveats

- **Trusted setup** per circuit (Groth16). Hackathon: single-party setup, disclosed.
- Browser proving is heavier than Bulletproofs but workable.
- Keeper has no key → **pre-proven schedule** (Phase 4).
- **Cash-out reveals** the unwrapped amount unless spent confidentially.
- **Composability**: Scallop/NAVI can't read encrypted balances → yield/collateral
  need a plaintext path.

## References
- `sui::groth16` framework module · [Sui Groth16 guide](https://docs.sui.io/guides/developer/cryptography/groth16)
- MystenLabs/confidential-transfers (`contra`) — design we port (Apache-2.0)
- [confidential-streaming-plan.md](./confidential-streaming-plan.md) (mechanism), [privacy-seal-plan.md](./privacy-seal-plan.md) (metadata)
