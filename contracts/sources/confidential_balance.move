/// Confidential balances for StreamLine — amounts hidden, correctness enforced
/// by Groth16 (BN254) verified on-chain via `sui::groth16` (the testnet/mainnet
/// native). A `ConfidentialPool<T>` holds a public reserve of real coins; who
/// owns how much is a table of **commitments** (Poseidon(value, blinding), one
/// 32-byte field element each). Every balance change carries a zk proof:
///   - wrap:     deposit a public Coin, bind it to a commitment of its value
///   - transfer: move a hidden delta; proof enforces conservation + no underflow
///   - unwrap:   reveal a value and prove it opens your commitment, then withdraw
///
/// The verifying keys are the production circuits in `circuits/` (build via
/// circuits/scripts/build.sh; bytes from circuits/converter).
module streamline::confidential_balance;

use sui::balance::{Self, Balance};
use sui::coin::{Self, Coin};
use sui::groth16::{Self, bn254};
use sui::table::{Self, Table};

// === Errors ===
const EProofInvalid: u64 = 0;
const EAccountExists: u64 = 1;
const ENoAccount: u64 = 2;
const EInsufficientReserve: u64 = 3;
const EBadCommitment: u64 = 4;

/// A BN254 scalar / Poseidon commitment is 32 bytes (little-endian).
const SCALAR_LEN: u64 = 32;

// === Verifying keys (per circuit; depend only on the circuit, not the witness) ===
const WRAP_VK: vector<u8> =
    x"1d8e4233c3c66ab59c2b3c265a2886837b80219952150d8f2e8bf26fb6dce2aac4c97bbe7457d570a27e0306ebde64269e0a9fd5a9bb0cb070a2824c0b65e710daeb07e8f409c3bd2a195bca7638955741c4590f5d98465d1a6481a2896f6006edf692d95cbdde46ddda5ef7d422436779445c5e66006a42761e1f12efde0018c212f3aeb785e49712e7a9353349aaf1255dfb31b7bf60723a480d9293938e1998447bbbeddc2ab57f1ec3df3725f5229dcf84b0c4b8a69269616841fd0d101402cf73bc38a6bf326831b3397837d8b50a9c1ca50997439ae23c92d5cdbc1c150300000000000000fa79096d22e37a607c8fb58319dbce0c2e34225163ea33dc71f6bf6e1ff26c99f91a01e098b7476894981a900d771285e8fc6b85106098a216d7204226ec0eb06260e372e904ed13d7793c40283242d8c382466e348c10c6f4992bfdb51674aa";
const TRANSFER_VK: vector<u8> =
    x"1d8e4233c3c66ab59c2b3c265a2886837b80219952150d8f2e8bf26fb6dce2aac4c97bbe7457d570a27e0306ebde64269e0a9fd5a9bb0cb070a2824c0b65e710daeb07e8f409c3bd2a195bca7638955741c4590f5d98465d1a6481a2896f6006edf692d95cbdde46ddda5ef7d422436779445c5e66006a42761e1f12efde0018c212f3aeb785e49712e7a9353349aaf1255dfb31b7bf60723a480d9293938e195767429f909fa9d9627afbb1166c6459625be9b20b0f4e7b5b81afcbfb187624313090e9b38c811b713adaf4da87a519f6c3628b0cbddbbb80567ecfa5faf6280500000000000000c0a9bbb59dd39ee783f7aa64cf28573442b5e08e4372e718046464dcd698501ca6342fbcd957ecf0b9f5995b423194a24f6e0fff2dad01e9dd83cc12db9e0e96e0479f3eff27e39639b45f5bffa23f37126e117423219779346515fd53980787fd4d3b9facc8d3162513617a23beeeb9c4e428dfe2e7f1422d5139b60e1f1e83ecebb66c32f3a4121e3355ea1e8b9ab8014300f6627c2b610563b16fdfd707b0";
const UNWRAP_VK: vector<u8> =
    x"1d8e4233c3c66ab59c2b3c265a2886837b80219952150d8f2e8bf26fb6dce2aac4c97bbe7457d570a27e0306ebde64269e0a9fd5a9bb0cb070a2824c0b65e710daeb07e8f409c3bd2a195bca7638955741c4590f5d98465d1a6481a2896f6006edf692d95cbdde46ddda5ef7d422436779445c5e66006a42761e1f12efde0018c212f3aeb785e49712e7a9353349aaf1255dfb31b7bf60723a480d9293938e19381df03f0666a2752f41a9a55ec66c83273e202b44a2765451bb1827b9ecf10011444f8bd0847dc925827e020a73bb66dda252add7ae227000d56ae78704f8020300000000000000fa79096d22e37a607c8fb58319dbce0c2e34225163ea33dc71f6bf6e1ff26c99f91a01e098b7476894981a900d771285e8fc6b85106098a216d7204226ec0eb06260e372e904ed13d7793c40283242d8c382466e348c10c6f4992bfdb51674aa";

// === Objects ===

/// Shared pool: a public reserve backing all confidential balances, plus the
/// commitment table (owner address → 32-byte balance commitment).
public struct ConfidentialPool<phantom T> has key {
    id: UID,
    reserve: Balance<T>,
    balances: Table<address, vector<u8>>,
}

// === Pool lifecycle ===

public fun create_pool<T>(ctx: &mut TxContext) {
    transfer::share_object(ConfidentialPool<T> {
        id: object::new(ctx),
        reserve: balance::zero<T>(),
        balances: table::new(ctx),
    });
}

// === Helpers ===

/// Verify a Groth16 proof or abort. `inputs` is the public signals as 32-byte
/// LE scalars in the circuit's signal order.
fun verify(vk: vector<u8>, inputs: vector<u8>, proof: vector<u8>) {
    let curve = bn254();
    let pvk = groth16::prepare_verifying_key(&curve, &vk);
    let public_inputs = groth16::public_proof_inputs_from_bytes(inputs);
    let proof_points = groth16::proof_points_from_bytes(proof);
    assert!(groth16::verify_groth16_proof(&curve, &pvk, &public_inputs, &proof_points), EProofInvalid);
}

/// u64 → 32-byte little-endian field scalar (matches snarkjs/arkworks).
fun u64_to_scalar(x: u64): vector<u8> {
    let mut out = vector<u8>[];
    let mut v = x;
    let mut i = 0;
    while (i < 8) {
        out.push_back(((v & 0xff) as u8));
        v = v >> 8;
        i = i + 1;
    };
    while (i < SCALAR_LEN) {
        out.push_back(0);
        i = i + 1;
    };
    out
}

fun assert_scalar(c: &vector<u8>) {
    assert!(c.length() == SCALAR_LEN, EBadCommitment);
}

// === Operations ===

/// Register an account with an initial commitment (e.g. a recipient's empty
/// balance, Poseidon(0, blinding)). No funds move; withdrawal still requires a
/// valid unwrap proof, so registering an arbitrary commitment is harmless.
public fun register<T>(pool: &mut ConfidentialPool<T>, commitment: vector<u8>, ctx: &TxContext) {
    assert_scalar(&commitment);
    let owner = ctx.sender();
    assert!(!pool.balances.contains(owner), EAccountExists);
    pool.balances.add(owner, commitment);
}

/// Enter the confidential balance: deposit a public coin and bind it to a
/// commitment proven (wrap.circom) to open to the coin's value.
/// Public signals: [commitment, amount].
public fun wrap<T>(
    pool: &mut ConfidentialPool<T>,
    coin: Coin<T>,
    commitment: vector<u8>,
    proof: vector<u8>,
    ctx: &TxContext,
) {
    assert_scalar(&commitment);
    let owner = ctx.sender();
    assert!(!pool.balances.contains(owner), EAccountExists);

    let amount = coin.value();
    let mut inputs = commitment;
    inputs.append(u64_to_scalar(amount));
    verify(WRAP_VK, inputs, proof);

    pool.reserve.join(coin.into_balance());
    pool.balances.add(owner, commitment);
}

/// Confidential transfer / drip: move a hidden delta from `from` to `to`. The
/// proof (transfer.circom) enforces conservation + no underflow against the
/// accounts' current commitments. Permissionless — anyone holding a valid
/// pre-proven step (e.g. the keeper) may submit it.
/// Public signals: [cSenderOld, cSenderNew, cRecipientOld, cRecipientNew].
public fun confidential_transfer<T>(
    pool: &mut ConfidentialPool<T>,
    from: address,
    to: address,
    new_from_commitment: vector<u8>,
    new_to_commitment: vector<u8>,
    proof: vector<u8>,
) {
    assert_scalar(&new_from_commitment);
    assert_scalar(&new_to_commitment);
    assert!(pool.balances.contains(from), ENoAccount);
    assert!(pool.balances.contains(to), ENoAccount);

    let old_from = *pool.balances.borrow(from);
    let old_to = *pool.balances.borrow(to);

    let mut inputs = old_from;
    inputs.append(new_from_commitment);
    inputs.append(old_to);
    inputs.append(new_to_commitment);
    verify(TRANSFER_VK, inputs, proof);

    *pool.balances.borrow_mut(from) = new_from_commitment;
    *pool.balances.borrow_mut(to) = new_to_commitment;
}

/// Leave the confidential balance: reveal `value`, prove it opens your
/// commitment (unwrap.circom), then withdraw it from the reserve. Fully
/// withdraws and closes the account.
/// Public signals: [commitment, value].
public fun unwrap<T>(
    pool: &mut ConfidentialPool<T>,
    value: u64,
    proof: vector<u8>,
    ctx: &mut TxContext,
): Coin<T> {
    let owner = ctx.sender();
    assert!(pool.balances.contains(owner), ENoAccount);
    let commitment = *pool.balances.borrow(owner);

    let mut inputs = commitment;
    inputs.append(u64_to_scalar(value));
    verify(UNWRAP_VK, inputs, proof);

    assert!(pool.reserve.value() >= value, EInsufficientReserve);
    pool.balances.remove(owner);
    coin::from_balance(pool.reserve.split(value), ctx)
}

// === Views ===

public fun reserve<T>(pool: &ConfidentialPool<T>): u64 { pool.reserve.value() }

public fun commitment_of<T>(pool: &ConfidentialPool<T>, owner: address): vector<u8> {
    *pool.balances.borrow(owner)
}

public fun has_account<T>(pool: &ConfidentialPool<T>, owner: address): bool {
    pool.balances.contains(owner)
}
