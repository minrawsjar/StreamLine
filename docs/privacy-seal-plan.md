# StreamLine Privacy — Seal + Walrus (Implementation Plan)

> Status: **PLAN ONLY** — no code changes yet. Scope chosen: encrypt milestone
> descriptions first, with dispute evidence as a fast-follow.

## Goal

Make a StreamLine stream's **human-readable contract data** private while keeping
the payment mechanics fully on-chain and permissionless. Today `stream.move`
publishes everything in the clear: `sender`/`freelancer` addresses, `total`,
every milestone `name` (plaintext `String`), milestone amounts, and split
destinations/weights.

We use two Sui-native frameworks:

- **Seal** (`@mysten/seal`) — threshold encryption with on-chain access control.
  Decryption is gated by a `seal_approve*` function **in our own Move package**,
  so the stream contract itself decides who can read.
- **Walrus** (`@mysten/walrus`, or HTTP publisher/aggregator) — decentralized
  blob storage for the ciphertext. Only a blob ID lives on-chain.

Builds on the **zkLogin/Enoki** session already wired in (`@mysten/enoki@0.13`),
which signs the Seal `SessionKey`.

## What is / isn't private

| Data | Private? | Mechanism |
|---|---|---|
| Milestone description / scope of work | ✅ | Seal-encrypted, Walrus blob, ref on-chain |
| Deliverables, dispute evidence | ✅ (phase 2) | same |
| Split routing config (savings/yield addrs) | ◻ optional | off-chain encrypted config |
| Counterparty identity | partial | zkLogin decouples from real-world identity |
| **Amounts** (total, milestone, drip) | ❌ | must stay public — keeper accrual + `drip` need them |

**Hard limitation:** confidential *amounts* are not a native Sui primitive. The
permissionless keeper computes `accrued = total * elapsed / duration` and splits
on-chain, so balances must be readable. Hiding amounts would require ZK range
proofs or a TEE (Nautilus) — explicitly out of scope. Privacy = metadata +
deliverables + identity.

## Architecture

```
Client (zkLogin)
  ├─ Seal.encrypt(description, id = streamId)         → ciphertext
  ├─ Walrus.put(ciphertext)                           → blobId
  └─ create_stream(..., name_blob = blobId, ...)      → on-chain (blobId only)

Reader (client / freelancer / arbiter)
  ├─ build PTB: moveCall streamline::stream::seal_approve(id, stream)
  ├─ Seal key servers run seal_approve → release key shares (threshold t-of-n)
  ├─ Walrus.get(blobId)                               → ciphertext
  └─ Seal.decrypt(ciphertext, sessionKey, txBytes)    → plaintext
```

The Rust indexer only ever stores/serves `blobId`s — it never sees plaintext.

## Move changes (`contracts/sources/stream.move`)

1. Replace plaintext milestone name with a blob reference:
   ```move
   public struct Milestone has store, copy, drop {
       name_blob: vector<u8>,   // Walrus blob ID of the Seal-encrypted description
       amount: u64,             // public (drip math)
   }
   ```
   Update `create_stream` to take `milestone_name_blobs: vector<vector<u8>>`
   instead of `milestone_names: vector<String>`. (Optional: keep a short public
   `label` like "Milestone 1" for UX, encrypt only the real scope text.)

2. Add the Seal access policy. Convention: the function is named `seal_approve*`,
   its first arg is the identity bytes `id`, and it **aborts** when access is
   denied (no return value):
   ```move
   const ENoAccess: u64 = 7;

   /// Seal policy: only the stream's two parties may decrypt its blobs.
   /// `id` must equal the stream object id (namespaces ciphertext to this stream).
   entry fun seal_approve<T>(id: vector<u8>, stream: &Stream<T>, ctx: &TxContext) {
       let s = ctx.sender();
       assert!(s == stream.sender || s == stream.freelancer, ENoAccess);
       assert!(id == object::id(stream).to_bytes(), ENoAccess);
   }
   ```
   For dispute evidence (phase 2), add `seal_approve_dispute<T>` that also allows
   a stored `arbiter: address` once `state == PAUSED`.

3. Tests: extend `contracts/tests/stream_tests.move` — assert `seal_approve`
   passes for sender/freelancer and aborts for a third party.

> Note: changing `create_stream`'s signature ripples into the frontend create
> flow, the Rust indexer event parser (`StreamCreated` is unaffected — it has no
> name field), and any keeper/test fixtures. Audit call sites before editing.

## Frontend changes

Add deps: `@mysten/seal`, `@mysten/walrus` (confirm latest versions against
`@mysten/sui@1.36`).

1. **lib/seal.ts** — construct a `SealClient` against **mainnet** key servers
   (Seal is live on Sui mainnet, same network as StreamLine's gasless transfers):
   ```ts
   import { SealClient, getAllowlistedKeyServers } from "@mysten/seal";
   const client = new SealClient({
     suiClient,
     serverConfigs: getAllowlistedKeyServers("mainnet").map((id) => ({ objectId: id, weight: 1 })),
     verifyKeyServers: false,
   });
   ```
2. **Encrypt on create** (client dashboard create flow):
   ```ts
   const { encryptedObject } = await client.encrypt({
     threshold: 1, packageId: PACKAGE_ID,
     id: streamIdBytes,            // = object id of the stream (or a pre-id nonce)
     data: new TextEncoder().encode(description),
   });
   const blobId = await walrusPut(encryptedObject);   // store ciphertext
   // pass blobId into create_stream PTB
   ```
   Chicken-and-egg: the stream object id doesn't exist until creation. Options:
   (a) use a client-chosen random nonce as the Seal `id` and store that nonce
   on-chain too; or (b) two-step: create stream, then attach encrypted blobs in a
   follow-up call keyed by the now-known object id. **Recommend (a)** — simpler,
   one transaction.
3. **Decrypt on read** (milestone card):
   ```ts
   const sessionKey = new SessionKey({ address, packageId: PACKAGE_ID, ttlMin: 10, suiClient });
   await signPersonalMessage(sessionKey.getPersonalMessage());  // zkLogin signs
   const tx = new Transaction();
   tx.moveCall({ target: `${PACKAGE_ID}::stream::seal_approve`, arguments: [tx.pure(idBytes), tx.object(streamId)] });
   const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
   const ciphertext = await walrusGet(blobId);
   const plaintext = await client.decrypt({ data: ciphertext, sessionKey, txBytes });
   ```
4. **Walrus helpers** — simplest path is the **mainnet** publisher/aggregator HTTP
   (Walrus is the production data layer paired with Seal):
   - `PUT https://publisher.walrus.space/v1/blobs` → returns blobId
   - `GET https://aggregator.walrus.space/v1/blobs/<blobId>`
   Confirm current endpoint hostnames against Walrus docs; swap to the
   `@mysten/walrus` SDK later for browser-native upload (needs WAL for storage).

## Backend (Rust indexer)

No decryption. If we add a `blobId` field to surfaced milestone data, extend the
Postgres schema + `poller.rs` parser to carry the opaque blob id only. Since
`StreamCreated` carries no name today, this may need a new event or an object
read — decide during implementation.

## Build order

1. Move: `Milestone.name_blob`, `seal_approve`, update `create_stream`, tests.
2. `lib/seal.ts` + Walrus helpers + encrypt-on-create.
3. Decrypt-on-read in the milestone UI; handle "no access" gracefully.
4. (Phase 2) dispute evidence + `seal_approve_dispute` + arbiter field.

## Open questions to resolve before coding

- Seal `id` strategy: random nonce (recommended) vs. post-creation attach.
- Key-server threshold: use **2-of-3** on mainnet for resilience (not 1-of-1).
- Walrus: HTTP publisher (fast) vs. SDK (browser-native, needs WAL/funding).
- Keep a public milestone label for UX, or encrypt everything?
- Confirm `@mysten/seal` / `@mysten/walrus` versions compatible with `@mysten/sui@1.36`.

## References

- Seal: https://github.com/MystenLabs/seal (see `seal_approve` patterns + SDK)
- Walrus: https://docs.walrus.site
- Builds on existing zkLogin via `@mysten/enoki`.
