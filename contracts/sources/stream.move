/// StreamLine — programmable milestone-gated payment streams.
///
/// A `Stream<T>` is a shared object holding a locked `Balance<T>`. Funds drip to
/// the recipient (split across destinations) only while the stream is DRIPPING,
/// which the client unlocks per milestone. The Move type system enforces the
/// state machine: every transition asserts the current state, so an illegal
/// transition aborts the whole transaction.
module streamline::stream;

use std::string::String;
use sui::balance::{Self, Balance};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event;

// === State machine ===
const STATE_LOCKED: u8 = 0;
const STATE_PENDING_REVIEW: u8 = 1;
const STATE_DRIPPING: u8 = 2;
const STATE_PAUSED: u8 = 3;
const STATE_DONE: u8 = 4;

/// Gasless floor: 0.01 USDC = 10_000 base units (6 decimals).
const MIN_DRIP: u64 = 10_000;
/// Basis-point denominator for splits and the keeper tip.
const BPS_DENOM: u64 = 10_000;
/// Keeper tip: 1 bps of each settled amount.
const TIP_BPS: u64 = 1;

// === Errors ===
const EWrongState: u64 = 0;
const ENotAuthorized: u64 = 1;
const EBadSplits: u64 = 2;
const EMilestoneTooSmall: u64 = 3;
const EBadDuration: u64 = 4;
const ENoMilestones: u64 = 5;
const ENotDue: u64 = 6;

// === Objects ===

/// One milestone: an amount (base units) that must be approved before it flows.
public struct Milestone has store, copy, drop {
    name: String,
    amount: u64,
}

/// One leg of the split: where a fraction of each drip is routed.
public struct SplitLeg has store, copy, drop {
    destination: address,
    weight_bps: u64,
    /// If true this leg is destined for a yield protocol (routing handled by a
    /// PTB downstream of `drip`); on-chain we still transfer the coin here.
    yield_flag: bool,
}

/// The streamed value object. Shared so a permissionless keeper can call `drip`.
public struct Stream<phantom T> has key {
    id: UID,
    sender: address,
    freelancer: address,
    balance: Balance<T>,
    total: u64,
    state: u8,
    milestones: vector<Milestone>,
    current_milestone: u64,
    /// Amount already settled within the current milestone.
    milestone_paid: u64,
    /// Total stream duration (ms). Accrual is proportional: total*elapsed/duration.
    duration_ms: u64,
    /// Computed gasless drip interval (informational; enforced by MIN_DRIP).
    drip_interval_ms: u64,
    /// Watermark for the last settlement (ms since epoch).
    last_drip_ms: u64,
    /// Review deadline for the raised milestone (ms); 0 when not pending.
    review_deadline_ms: u64,
    dispute_window_ms: u64,
    splits: vector<SplitLeg>,
}

/// Client control capability — ties the holder to exactly one stream.
public struct StreamCap has key, store {
    id: UID,
    stream_id: ID,
    revocable: bool,
}

// === Events (field names mirror the Rust indexer's parser) ===

public struct StreamCreated has copy, drop {
    stream_id: ID,
    sender: address,
    freelancer: address,
    total: u64,
    n_milestones: u64,
}

public struct MilestoneRaised has copy, drop {
    stream_id: ID,
    milestone_index: u64,
    review_deadline_ms: u64,
}

public struct MilestoneApproved has copy, drop {
    stream_id: ID,
    milestone_index: u64,
}

public struct StreamDripped has copy, drop {
    stream_id: ID,
    amount: u64,
    timestamp_ms: u64,
}

public struct StreamPaused has copy, drop {
    stream_id: ID,
}

// === Lifecycle ===

/// Lock the full amount and create a shared milestone stream. The client
/// receives a `StreamCap`. Milestone amounts must each be ≥ MIN_DRIP and sum to
/// the locked amount.
#[allow(lint(self_transfer))]
public fun create_stream<T>(
    payment: Coin<T>,
    freelancer: address,
    milestone_names: vector<String>,
    milestone_amounts: vector<u64>,
    duration_ms: u64,
    dispute_window_ms: u64,
    revocable: bool,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(duration_ms > 0, EBadDuration);
    let n = milestone_amounts.length();
    assert!(n > 0, ENoMilestones);
    assert!(milestone_names.length() == n, ENoMilestones);

    let total = payment.value();
    let mut milestones: vector<Milestone> = vector[];
    let mut sum = 0;
    let mut i = 0;
    while (i < n) {
        let amount = milestone_amounts[i];
        assert!(amount >= MIN_DRIP, EMilestoneTooSmall);
        sum = sum + amount;
        milestones.push_back(Milestone { name: milestone_names[i], amount });
        i = i + 1;
    };
    assert!(sum == total, EBadSplits);

    let drip_interval_ms =
        ceil_div((MIN_DRIP as u128) * (duration_ms as u128), total as u128);

    let sender = ctx.sender();
    let now = clock.timestamp_ms();

    // Default split: 100% to the freelancer's wallet (they can reconfigure).
    let mut splits: vector<SplitLeg> = vector[];
    splits.push_back(SplitLeg {
        destination: freelancer,
        weight_bps: BPS_DENOM,
        yield_flag: false,
    });

    let stream = Stream<T> {
        id: object::new(ctx),
        sender,
        freelancer,
        balance: payment.into_balance(),
        total,
        state: STATE_LOCKED,
        milestones,
        current_milestone: 0,
        milestone_paid: 0,
        duration_ms,
        drip_interval_ms,
        last_drip_ms: now,
        review_deadline_ms: 0,
        dispute_window_ms,
        splits,
    };
    let stream_id = object::id(&stream);

    event::emit(StreamCreated {
        stream_id,
        sender,
        freelancer,
        total,
        n_milestones: n,
    });

    let cap = StreamCap { id: object::new(ctx), stream_id, revocable };
    transfer::public_transfer(cap, sender);
    transfer::share_object(stream);
}

/// Freelancer reconfigures where each drip is routed. Weights must sum to 10000.
public fun set_splits<T>(
    stream: &mut Stream<T>,
    destinations: vector<address>,
    weights_bps: vector<u64>,
    yield_flags: vector<bool>,
    ctx: &TxContext,
) {
    assert!(ctx.sender() == stream.freelancer, ENotAuthorized);
    let n = destinations.length();
    assert!(
        n > 0 && weights_bps.length() == n && yield_flags.length() == n,
        EBadSplits,
    );
    let mut splits: vector<SplitLeg> = vector[];
    let mut sum = 0;
    let mut i = 0;
    while (i < n) {
        let weight_bps = weights_bps[i];
        sum = sum + weight_bps;
        splits.push_back(SplitLeg {
            destination: destinations[i],
            weight_bps,
            yield_flag: yield_flags[i],
        });
        i = i + 1;
    };
    assert!(sum == BPS_DENOM, EBadSplits);
    stream.splits = splits;
}

/// Freelancer signals the current milestone is complete; starts the review clock.
public fun raise_completion<T>(stream: &mut Stream<T>, clock: &Clock, ctx: &TxContext) {
    assert!(ctx.sender() == stream.freelancer, ENotAuthorized);
    assert!(stream.state == STATE_LOCKED, EWrongState);
    let deadline = clock.timestamp_ms() + stream.dispute_window_ms;
    stream.state = STATE_PENDING_REVIEW;
    stream.review_deadline_ms = deadline;
    event::emit(MilestoneRaised {
        stream_id: object::id(stream),
        milestone_index: stream.current_milestone,
        review_deadline_ms: deadline,
    });
}

/// Client approves the raised milestone (via the cap); dripping begins.
public fun approve_milestone<T>(cap: &StreamCap, stream: &mut Stream<T>, clock: &Clock) {
    assert!(cap.stream_id == object::id(stream), ENotAuthorized);
    assert!(stream.state == STATE_PENDING_REVIEW, EWrongState);
    stream.state = STATE_DRIPPING;
    stream.last_drip_ms = clock.timestamp_ms();
    stream.review_deadline_ms = 0;
    event::emit(MilestoneApproved {
        stream_id: object::id(stream),
        milestone_index: stream.current_milestone,
    });
}

/// Keeper auto-approves once the review deadline passes — silence ≠ blocking pay.
public fun auto_approve<T>(stream: &mut Stream<T>, clock: &Clock) {
    assert!(stream.state == STATE_PENDING_REVIEW, EWrongState);
    let now = clock.timestamp_ms();
    assert!(now >= stream.review_deadline_ms, ENotDue);
    stream.state = STATE_DRIPPING;
    stream.last_drip_ms = now;
    stream.review_deadline_ms = 0;
    event::emit(MilestoneApproved {
        stream_id: object::id(stream),
        milestone_index: stream.current_milestone,
    });
}

/// Permissionless settlement. Pays out the amount accrued since the last drip
/// (≥ MIN_DRIP), split across destinations, minus a 1 bps keeper tip to the
/// caller. Locks when the current milestone is fully paid.
#[allow(lint(self_transfer))]
public fun drip<T>(stream: &mut Stream<T>, clock: &Clock, ctx: &mut TxContext) {
    assert!(stream.state == STATE_DRIPPING, EWrongState);
    let now = clock.timestamp_ms();
    let elapsed = now - stream.last_drip_ms;
    let accrued =
        (((stream.total as u128) * (elapsed as u128)) / (stream.duration_ms as u128)) as u64;

    let milestone_amount = stream.milestones[stream.current_milestone].amount;
    let milestone_remaining = milestone_amount - stream.milestone_paid;

    let mut pay = accrued;
    if (pay > milestone_remaining) pay = milestone_remaining;
    let bal = stream.balance.value();
    if (pay > bal) pay = bal;
    assert!(pay >= MIN_DRIP, ENotDue);

    let tip = pay * TIP_BPS / BPS_DENOM;
    let distributable = pay - tip;

    let n = stream.splits.length();
    let mut distributed = 0;
    let mut i = 0;
    while (i < n) {
        let leg = stream.splits[i]; // SplitLeg has copy — no lingering borrow
        let amount = if (i + 1 == n) {
            distributable - distributed
        } else {
            ((distributable as u128) * (leg.weight_bps as u128) / (BPS_DENOM as u128)) as u64
        };
        distributed = distributed + amount;
        if (amount > 0) {
            let part = stream.balance.split(amount);
            // Production: the gasless Address Balances `send_funds` path runs here.
            transfer::public_transfer(coin::from_balance(part, ctx), leg.destination);
        };
        i = i + 1;
    };
    if (tip > 0) {
        let part = stream.balance.split(tip);
        transfer::public_transfer(coin::from_balance(part, ctx), ctx.sender());
    };

    stream.milestone_paid = stream.milestone_paid + pay;
    stream.last_drip_ms = now;
    event::emit(StreamDripped {
        stream_id: object::id(stream),
        amount: pay,
        timestamp_ms: now,
    });

    if (stream.milestone_paid >= milestone_amount) {
        stream.milestone_paid = 0;
        stream.current_milestone = stream.current_milestone + 1;
        if (stream.current_milestone >= stream.milestones.length()) {
            stream.state = STATE_DONE;
        } else {
            stream.state = STATE_LOCKED;
        };
    };
}

/// Either party pauses a pending/dripping stream pending arbitration.
public fun raise_dispute<T>(stream: &mut Stream<T>, ctx: &TxContext) {
    let s = ctx.sender();
    assert!(s == stream.sender || s == stream.freelancer, ENotAuthorized);
    assert!(
        stream.state == STATE_PENDING_REVIEW || stream.state == STATE_DRIPPING,
        EWrongState,
    );
    stream.state = STATE_PAUSED;
    event::emit(StreamPaused { stream_id: object::id(stream) });
}

/// Client cancels a revocable stream and reclaims the unstreamed balance.
public fun cancel<T>(cap: StreamCap, stream: &mut Stream<T>, ctx: &mut TxContext) {
    assert!(cap.stream_id == object::id(stream), ENotAuthorized);
    assert!(cap.revocable, ENotAuthorized);
    let amount = stream.balance.value();
    if (amount > 0) {
        let refund = stream.balance.split(amount);
        transfer::public_transfer(coin::from_balance(refund, ctx), stream.sender);
    };
    stream.state = STATE_DONE;
    let StreamCap { id, stream_id: _, revocable: _ } = cap;
    id.delete();
}

// === Views ===

public fun state<T>(s: &Stream<T>): u8 { s.state }

public fun is_dripping<T>(s: &Stream<T>): bool { s.state == STATE_DRIPPING }

public fun remaining<T>(s: &Stream<T>): u64 { s.balance.value() }

public fun current_milestone<T>(s: &Stream<T>): u64 { s.current_milestone }

public fun drip_interval_ms<T>(s: &Stream<T>): u64 { s.drip_interval_ms }

public fun total<T>(s: &Stream<T>): u64 { s.total }

// === Helpers ===

fun ceil_div(a: u128, b: u128): u64 {
    (((a + b - 1) / b) as u64)
}
