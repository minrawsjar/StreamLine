/// StreamLine — private engagement (default private stream path).
///
/// Combines the shielded pool (graph hiding) with lazy vesting (no drip cadence).
/// There is no on-chain `sender` / `freelancer`: parties only learn openings via
/// encrypted notes. Deposit/withdraw still reveal amount at the anonymity-set
/// boundary; everything between is unlinkable.
module streamline::private_stream;

use sui::clock::Clock;
use sui::coin::Coin;
use sui::event;
use streamline::confidential_balance;
use streamline::shielded_pool::{Self, ShieldedPool};

const EFutureTime: u64 = 0;
const EParamsMismatch: u64 = 1;

/// Pins a vesting schedule (`params_commitment`) to a funding note without
/// naming the parties. Shared so settle is permissionless for anyone holding
/// the note openings (relayer-friendly).
public struct PrivateEngagement has key {
    id: UID,
    /// Poseidon(rate, start_sec, cap, blinding) — schedule pin.
    params_commitment: u256,
    /// Initial deposit note commitment (informational; spent on first settle).
    funding_cm: u256,
}

/// No parties. Links funding note ↔ schedule commitment at the boundary.
public struct EngagementOpened has copy, drop {
    engagement_id: ID,
    funding_cm: u256,
    params_commitment: u256,
}

/// Graph-hiding settle — mirrors `Spent` (no amounts, no parties, no clock).
public struct EngagementSettled has copy, drop {
    engagement_id: ID,
    nullifier: u256,
    cm1: u256,
    cm2: u256,
}

/// Open a private engagement: deposit into the shielded pool and pin the
/// vesting schedule. Optional `ciphertext` publishes an encrypted opening to
/// the counterparty (ECIES sealed box via `publish_note`).
public fun open_engagement<T>(
    pool: &mut ShieldedPool<T>,
    payment: Coin<T>,
    cm: u256,
    deposit_proof: vector<u8>,
    params_commitment: u256,
    ciphertext: vector<u8>,
    ctx: &mut TxContext,
) {
    shielded_pool::deposit(pool, payment, cm, deposit_proof);
    if (ciphertext.length() > 0) {
        shielded_pool::publish_note(pool, cm, ciphertext);
    };
    let engagement = PrivateEngagement {
        id: object::new(ctx),
        params_commitment,
        funding_cm: cm,
    };
    let engagement_id = object::id(&engagement);
    event::emit(EngagementOpened {
        engagement_id,
        funding_cm: cm,
        params_commitment,
    });
    transfer::share_object(engagement);
}

/// Vesting-bounded shielded spend. Prover supplies `now_sec` (≤ chain clock);
/// proof must use this engagement's `params_commitment`.
public fun settle_vested<T>(
    pool: &mut ShieldedPool<T>,
    engagement: &PrivateEngagement,
    root: u256,
    nf: u256,
    cm1: u256,
    cm2: u256,
    params_commitment: u256,
    now_sec: u64,
    proof: vector<u8>,
    worker_ciphertext: vector<u8>,
    clock: &Clock,
) {
    assert!(now_sec <= clock.timestamp_ms() / 1000, EFutureTime);
    assert!(params_commitment == engagement.params_commitment, EParamsMismatch);
    settle_into(
        pool,
        engagement,
        root,
        nf,
        cm1,
        cm2,
        params_commitment,
        now_sec,
        proof,
        worker_ciphertext,
    );
}

fun settle_into<T>(
    pool: &mut ShieldedPool<T>,
    engagement: &PrivateEngagement,
    root: u256,
    nf: u256,
    cm1: u256,
    cm2: u256,
    params_commitment: u256,
    now_sec: u64,
    proof: vector<u8>,
    worker_ciphertext: vector<u8>,
) {
    confidential_balance::verify_private_settle(
        root,
        nf,
        cm1,
        cm2,
        params_commitment,
        now_sec,
        proof,
    );
    shielded_pool::apply_private_settle(pool, root, nf, cm1, cm2);
    if (worker_ciphertext.length() > 0) {
        shielded_pool::publish_note(pool, cm1, worker_ciphertext);
    };
    event::emit(EngagementSettled {
        engagement_id: object::id(engagement),
        nullifier: nf,
        cm1,
        cm2,
    });
}

/// Exit to public coins (boundary leak: amount revealed). Thin wrapper.
public fun claim_exit<T>(
    pool: &mut ShieldedPool<T>,
    root: u256,
    nf: u256,
    amount: u64,
    cm_change: u256,
    proof: vector<u8>,
    ctx: &mut TxContext,
): Coin<T> {
    shielded_pool::withdraw(pool, root, nf, amount, cm_change, proof, ctx)
}

public fun params_commitment(e: &PrivateEngagement): u256 { e.params_commitment }
public fun funding_cm(e: &PrivateEngagement): u256 { e.funding_cm }

#[test_only]
public fun create_engagement_for_testing(
    params_commitment: u256,
    funding_cm: u256,
    ctx: &mut TxContext,
): PrivateEngagement {
    PrivateEngagement {
        id: object::new(ctx),
        params_commitment,
        funding_cm,
    }
}

#[test_only]
public fun share_engagement_for_testing(e: PrivateEngagement) {
    transfer::share_object(e);
}

#[test_only]
public fun settle_vested_for_testing<T>(
    pool: &mut ShieldedPool<T>,
    engagement: &PrivateEngagement,
    root: u256,
    nf: u256,
    cm1: u256,
    cm2: u256,
    params_commitment: u256,
    now_sec: u64,
    proof: vector<u8>,
) {
    assert!(params_commitment == engagement.params_commitment, EParamsMismatch);
    settle_into(pool, engagement, root, nf, cm1, cm2, params_commitment, now_sec, proof, vector[]);
}
