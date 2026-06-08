/// Borrowing against a live stream. A DRIPPING stream has a calculable present
/// value, so a freelancer can mint a (non-transferable) `CollateralReceipt`
/// against it. The actual lending integration (Scallop/NAVI) is driven by a PTB
/// that wraps this call; on-chain we record the position and its present value.
module streamline::collateral;

use streamline::stream::{Self, Stream};
use sui::event;

const ENotDripping: u64 = 0;
const EOverLtv: u64 = 1;

/// Discount applied to remaining stream value to get present value (bps).
const PV_DISCOUNT_BPS: u64 = 9_000; // 90%
const BPS_DENOM: u64 = 10_000;

/// Non-transferable position receipt — `key` only (no `store`), so a holder
/// cannot transfer or wrap it.
public struct CollateralReceipt has key {
    id: UID,
    stream_id: ID,
    lender: address,
    principal: u64,
    auto_repay: bool,
}

public struct Collateralized has copy, drop {
    stream_id: ID,
    principal: u64,
    lender: address,
    pv: u64,
}

/// Present value of the remaining stream balance after the risk discount.
public fun present_value<T>(s: &Stream<T>): u64 {
    (((stream::remaining(s) as u128) * (PV_DISCOUNT_BPS as u128)) / (BPS_DENOM as u128)) as u64
}

/// Open a collateral position against a dripping stream. `principal` may not
/// exceed the present value. Mints a receipt to the caller (the freelancer).
public fun collateralize<T>(
    s: &Stream<T>,
    lender: address,
    principal: u64,
    auto_repay: bool,
    ctx: &mut TxContext,
) {
    assert!(stream::is_dripping(s), ENotDripping);
    let pv = present_value(s);
    assert!(principal <= pv, EOverLtv);

    let stream_id = object::id(s);
    let receipt = CollateralReceipt {
        id: object::new(ctx),
        stream_id,
        lender,
        principal,
        auto_repay,
    };
    event::emit(Collateralized { stream_id, principal, lender, pv });
    transfer::transfer(receipt, ctx.sender());
}

// === Views ===

public fun principal(r: &CollateralReceipt): u64 { r.principal }

public fun stream_id(r: &CollateralReceipt): ID { r.stream_id }

public fun auto_repay(r: &CollateralReceipt): bool { r.auto_repay }
