#[test_only]
module streamline::stream_tests;

use streamline::stream::{Self, Stream, StreamCap};
use std::string;
use sui::clock;
use sui::coin;
use sui::sui::SUI;
use sui::test_scenario as ts;

const CLIENT: address = @0xC1;
const FREELANCER: address = @0xF1;
const KEEPER: address = @0xCA11;

// 0.01 USDC floor in base units.
const MIN_DRIP: u64 = 10_000;

fun names(): vector<string::String> {
    vector[string::utf8(b"Wireframes"), string::utf8(b"Final")]
}

#[test]
fun full_milestone_flow() {
    let mut sc = ts::begin(CLIENT);
    let mut clk = clock::create_for_testing(ts::ctx(&mut sc));

    // total 200 over 2 milestones of 100 each, 1000ms duration.
    let total = 200 * MIN_DRIP;
    let amounts = vector[100 * MIN_DRIP, 100 * MIN_DRIP];

    // create_stream (client locks funds, gets cap)
    {
        let pay = coin::mint_for_testing<SUI>(total, ts::ctx(&mut sc));
        stream::create_stream<SUI>(
            pay, FREELANCER, names(), amounts, 1_000, 1_000, true, &clk, ts::ctx(&mut sc),
        );
    };

    // freelancer raises milestone 0
    ts::next_tx(&mut sc, FREELANCER);
    {
        let mut s = ts::take_shared<Stream<SUI>>(&sc);
        stream::raise_completion<SUI>(&mut s, &clk, ts::ctx(&mut sc));
        assert!(stream::state(&s) == 1, 0); // PENDING_REVIEW
        ts::return_shared(s);
    };

    // client approves → DRIPPING
    ts::next_tx(&mut sc, CLIENT);
    {
        let cap = ts::take_from_sender<StreamCap>(&sc);
        let mut s = ts::take_shared<Stream<SUI>>(&sc);
        stream::approve_milestone<SUI>(&cap, &mut s, &clk);
        assert!(stream::state(&s) == 2, 1); // DRIPPING
        ts::return_shared(s);
        ts::return_to_sender(&sc, cap);
    };

    // advance the clock past the full first milestone and drip
    clk.increment_for_testing(1_000);
    ts::next_tx(&mut sc, KEEPER);
    {
        let mut s = ts::take_shared<Stream<SUI>>(&sc);
        stream::drip<SUI>(&mut s, &clk, ts::ctx(&mut sc));
        // milestone 0 exhausted → relocks for milestone 1
        assert!(stream::state(&s) == 0, 2); // LOCKED
        assert!(stream::current_milestone(&s) == 1, 3);
        // ~half the total paid out (milestone 0 = 100 units)
        assert!(stream::remaining(&s) <= 100 * MIN_DRIP, 4);
        ts::return_shared(s);
    };

    clock::destroy_for_testing(clk);
    ts::end(sc);
}

#[test]
#[expected_failure(abort_code = streamline::stream::EWrongState)]
fun cannot_drip_while_locked() {
    let mut sc = ts::begin(CLIENT);
    let clk = clock::create_for_testing(ts::ctx(&mut sc));
    let total = 200 * MIN_DRIP;
    let amounts = vector[100 * MIN_DRIP, 100 * MIN_DRIP];
    {
        let pay = coin::mint_for_testing<SUI>(total, ts::ctx(&mut sc));
        stream::create_stream<SUI>(
            pay, FREELANCER, names(), amounts, 1_000, 1_000, true, &clk, ts::ctx(&mut sc),
        );
    };
    // dripping a LOCKED stream must abort
    ts::next_tx(&mut sc, KEEPER);
    {
        let mut s = ts::take_shared<Stream<SUI>>(&sc);
        stream::drip<SUI>(&mut s, &clk, ts::ctx(&mut sc));
        ts::return_shared(s);
    };
    clock::destroy_for_testing(clk);
    ts::end(sc);
}
