# Governance correctness, recovery and performance review

**Date:** 27 October 2026

**Author:** [@aixaria0](https://github.com/aixaria0)

**Scope:** Pinned repository and upstream source review, prior-finding reconciliation, and executable offline client witnesses.

**Repository:** [rhovision-org/rhogov](https://github.com/rhovision-org/rhogov)

## 1. Engineering conclusion

rhogov has a useful architecture worth preserving: a portable static client, local signing, shared governance contracts, and native trust/delegation computation. Its next development phase should establish three properties: **only eligible identities contribute to a decision; every published result is complete and reproducible; every signed action remains recoverable through communication and storage failures.** Performance work should follow those boundaries and make them cheaper to enforce.

The deeper review adds seven areas to the original sixteen findings. The most significant additions concern the electorate supplied to native calculations, non-canonical ballots, negative voucher values, and the authority of council objects discovered by naming convention. These are more fundamental than visual polish or bundle size.

The original assessment remains broadly valid, with tighter qualifications below. The release is suitable for continued development and bounded experiments. The evidence does **not** establish readiness for consequential organizational decisions or valuable signing identities. This is a risk assessment based on identified paths, not a claim that a live community has been attacked.

The recommended direction is a small number of explicit interfaces: a validated governance input, a snapshot-bound read result, a durable write journal, and a versioned decision record. A backend, framework replacement, or wholesale rewrite is unnecessary for the defects demonstrated here.

## 2. Baseline, method, and limits

### 2.1 Exact versions

| Component | Audited reference | Interpretation |
|---|---|---|
| rhogov `main` | `fc4a4feac24107d7a667dffa1e4de95612ec7c50` | Rechecked; unchanged from the preceding report |
| Open rhogov PR #109 | `f7af35e21d19c7cf2bb377345015ec4912536260` | Proposed code, not treated as deployed |
| Main's vendored core | quantum-os `c560104` in the vendor header | Inbox plus Group/4 and Issue/4 generation |
| PR #109's vendored core | quantum-os `899bfd47059ed106e3b2cff320c2128e09147a35` | Adds Inbox/4 history |
| Documented native baseline | Rholo `bc80abbba42661f0252c04f931e6a4ac58bb6737` | Source referenced by rhogov's documentation |
| Reported playground build reference | Rholo `a5259969a7c5673ccdfc5dad97981d0a3607fcf0` | An upstream report, not a binary independently observed here |
| Current native source examined | Rholo `e0b271ec93490b0133966c08697b63da1204047a` | Upstream source reference, not a deployment assertion |

The `qucalc/src/lib.rs` bytes retrieved for the three Rholo references above were identical. Their local SHA-256 was `9b75531831aa629c347ae41a5211459e001c004b1163c154f4cac3e31d15bacf`. The relevant 512-entry handler limit and its record-count expressions were also present in the documented baseline's `system_processes.rs`.

PR #109's core body matched quantum-os `899bfd4` exactly after removing its two-line vendor header. This is a positive provenance check; it is not functional acceptance of either contract generation.

### 2.2 Evidence levels

- **Executed client witness:** actual project functions executed with controlled storage, transport, or input fixtures. No live deploy was sent.
- **Source-confirmed path:** guards, data flow, and calculation are visible in pinned source. Full native/contract execution remains required.
- **Derived example:** an arithmetic consequence of the inspected source. It is not counted as execution of the native binary.
- **Unmeasured operational risk:** behavior or capacity requiring a real browser, node, or validator campaign.

The repository contains 112 tracked files, including 31 under `src/` and 34 under `tests/`. The review concentrated on signing, receipts, state isolation, native query construction, contract dispatch, council arithmetic, inbox persistence/history, and release workflows.

This submission contains documentation and diagnostic evidence. Application source, contracts, release workflows and deployed state are unchanged. The client witnesses use synthetic storage and transport fixtures; they send no live deploys. Native/contract attack scenarios, live-chain checks and a local browser campaign were not executed. Public CI observations are identified separately.

The [reproduction guide](evidence/README.md) provides the two offline scripts and their captured outputs. They assert the observed baseline behavior, including defects; a successful diagnostic run means the finding reproduced, not that the product passed the proposed acceptance criteria.

### 2.3 Validation record

| Check | Result | What it establishes |
|---|---|---|
| Main core selftest, preceding run at the same SHA | 95/95 passed | Structural/builder checks, not complete contract semantics |
| Main offline unit checks, preceding run at the same SHA | 150/150 passed | Existing tested cases |
| Name-scope tests, preceding run at the same SHA | 6/6 passed | Existing directory isolation cases |
| Main build, preceding run at the same SHA | Passed | TypeScript and production build |
| Main build size | 374,330 bytes; gzip 124,147 bytes | Local build measurement, not page-load latency |
| Original diagnostic witnesses rerun | 7 completed | Original client behaviors reproduced |
| Additional diagnostic witnesses | 9 completed | New inputs, races, arithmetic and request-count cases |
| PR #109 core selftest | 103/103 passed | Structural checks for proposed vendor generation |
| Latest examined main browser campaign | 50 passed, 1 failed | Public CI evidence; localnet job skipped |

The earlier `npm test` wrapper hit an environment-specific `tsx` IPC socket restriction. The unit file and name-scope tests passed through `node --import tsx`; that restriction is not attributed to rhogov.

The browser failure is [run 40506030083](https://github.com/rhovision-org/rhogov/actions/runs/40506030083), [playground job](https://github.com/rhovision-org/rhogov/actions/runs/40506030083/job/122217266990). The failure counted two deploys where one was expected. [The maintainer's explanation](https://github.com/rhovision-org/rhogov/pull/109#issuecomment-6444015234) identifies the background name-list deploy. That explanation fits the source. The failed count alone does not establish an extra signature for the reviewed group action. The proposed test repair nevertheless has its own defect, discussed below.

## 3. Reassessment of the initial sixteen findings

The identifiers F-01–F-16 are preserved. D-01–D-07 identify additions from this deeper review. They are work areas, not twenty-three independent exploit claims.

| Prior ID | Reassessment | New precision or evidence |
|---|---|---|
| F-01: lost uncertain-write receipt | Confirmed | Transport errors after signing still clear the receipt; install uses a separate, weaker path |
| F-02: archive failure after collection | Confirmed | Normal collect silently tolerates storage failure; stricter import tests do not cover it |
| F-03: partial council result | Confirmed | A failed 60% chamber changes the computed leader in the executed witness |
| F-04: stale close/record | Confirmed from source | Closing and then using the earlier render's `out` is not a close-time snapshot |
| F-05: mutable final record/status | Confirmed from source | `propose` can overwrite after close; `lock` can replace closed status |
| F-06: logical batch failure | Confirmed from source | A returned `gov-error` is not a transaction rollback |
| F-07: partial reads look successful | Strengthened | An entirely absent native answer also becomes an ordinary empty outcome |
| F-08: read amplification | Strengthened | The declared 10-group/100-distinct-issue fixture executes exactly 121 explore calls |
| F-09: mixed snapshots | Confirmed from source | TTL caching does not bind an entire screen or decision to one block |
| F-10: review setting excludes routine writes | Confirmed, qualified | An intentional exception conflicts with the broad setting text; it is not proof of forged consent |
| F-11: #109 test filter | Confirmed in the audited PR head | The refusal test filters for `Reviewed club` while it performs a leave from `Refused club` |
| F-12: independent deployment pipeline | Confirmed | Pages has no dependency on test success; branch API still reports unprotected, rulesets empty |
| F-13: community storage key | Confirmed, bounded | Collision demonstrated with the same URI on different synthetic chains; no real URI collision was observed |
| F-14: tabs and late responses | Strengthened | An old inbox response writes into the newly active community; failed genesis reads also set `chainChecked` |
| F-15: active key storage | Strengthened, qualified | The Pages project path shares its origin with sibling paths; no compromise or secret leak was observed |
| F-16: compatibility/documentation drift | Confirmed | Directory status remains awaiting direct confirmation; historic probes and size claims need reconciliation |

## 4. New findings that change the improvement plan

Priority bands here are planning decisions: **P0** before consequential use, **P1** for the next reliability/release tranche, **P2** for subsequent hardening. These are not CVSS scores.

### D-01 — The calculation's population is not bounded by the authorized electorate

**Priority: P0. Evidence: source-confirmed cross-layer path.**

The Group contract's `delegate`, `rate`, and `censure` verbs authenticate the caller's identity but do not check that the caller belongs to the group. Public facts attributed to their author can be a legitimate design. The problem appears when those facts are interpreted as voting authority without a separate eligibility projection.

`standingProgram` reads raw delegations, ratings, censures and admins. It does not supply the group's membership or the issue's authorized electorate to the native calculation. `resolve_weights` expands its population from direct voters, delegation keys, delegation targets and trust-map keys. A nonmember delegation to an eligible direct voter can therefore add a base unit of weight. A legitimate member who is not on the issue's roll can also potentially influence its outcome through delegation instead of a direct ballot.

The council path filters **direct ballots** by chamber membership, but still uses the chamber's raw delegation/standing records. Restricting direct voters alone does not restrict the population contributing delegated weight.

An external rating can also affect whether trust weighting is enabled at all: the query tests whether the raw ratings list is nonempty. Eligibility filtering must precede that mode decision as well as the weight calculation.

**Derived witness:** two authorized direct voters A and B each start at weight 1. If N external identities record delegation to A and the records are fed unchanged to the native, A receives `1 + N`, while B remains 1. This follows from the native's population construction. It was not executed as a signed attack against a deployed contract.

**Recommended boundary:** define the eligible population E explicitly for each calculation. For group standing, E can be the approved group membership snapshot. For an issue, decide whether E is its roll plus authorized guests, the group snapshot, or another declared population. Normalize facts against E before the native calculation: admissible sources, targets, ratings and censure participation must follow the chosen policy. A native interface that takes E explicitly is easier to audit than inferring it from incidental map keys.

Contract membership guards can prevent new invalid facts, but do not repair already stored records or resolve the roll-versus-membership policy. A browser-only filter is not sufficient enforcement for shared interoperability. The canonical query/native boundary and the contract generation must agree.

**Required acceptance:** outsiders, departed members, late members outside the roll, guests, cross-chamber delegates, delegation chains crossing E, and cycles. Adding records from identities outside E must not change an otherwise identical eligible result.

Sources: [Group delegation/rating/censure](https://github.com/rhovision-org/rhogov/blob/fc4a4feac24107d7a667dffa1e4de95612ec7c50/src/chain/rgov-core.js#L560), [query construction](https://github.com/rhovision-org/rhogov/blob/fc4a4feac24107d7a667dffa1e4de95612ec7c50/src/chain/gov.ts#L273), [native population](https://github.com/rhovision-org/rholo/blob/bc80abbba42661f0252c04f931e6a4ac58bb6737/qucalc/src/lib.rs#L503).

### D-02 — A negative voucher can make a censure increase trust

**Priority: P0. Evidence: source-confirmed arithmetic path; native execution pending.**

The normal `Gov.rate()` client API correctly clamps its input to 0–5. The deeper witness confirmed this defense; an initial hypothesis that this API directly forwards negatives was rejected. The contract, however, stores an arbitrary supplied rating level, and native parsing accepts an `i64` without a nonnegative range check. A custom signed client need not use `Gov.rate()`.

The censure function subtracts the recorded voucher stake using `cur.saturating_sub(stake).max(0)`. Saturation prevents overflow, but subtracting a negative value still increases the result. For a voucher at level 0 with a recorded stake of -100, discrediting the vouchee changes that voucher's level to 100:

`max(0, 0 - (-100)) = 100`.

A concrete source-level fixture is admins A/B/C at level 5, D/E at 0, censures A→D/B→D/C→D, and voucher E→D with stake -100. D has four eligible peers, so three censures meet the threshold. The voucher update then raises E. This is not prevented by the normal UI's slider or client clamp.

**Recommended fix:** validate the domain of ratings and vouchers at the protocol boundary, and ensure the censure transformation is monotone decreasing. Define whether the slash applies to raw requested stake or effective conferred stake; the two are not interchangeable. New contract writes should reject invalid values, while computation over legacy data must handle previously stored negatives consistently. Valid trust policy should remain explicit rather than silently changing who has a vote.

**Required acceptance:** negative/minimum/maximum integers, self-ratings, outsider ratings, raw stake greater than the rater's effective level, and cascading censures. For valid inputs, every post-censure level must be no greater than its pre-censure level and must stay within the declared trust domain.

Sources: [client clamp](https://github.com/rhovision-org/rhogov/blob/fc4a4feac24107d7a667dffa1e4de95612ec7c50/src/chain/gov.ts#L510), [contract storage](https://github.com/rhovision-org/rhogov/blob/fc4a4feac24107d7a667dffa1e4de95612ec7c50/src/chain/rgov-core.js#L596), [raw parser](https://github.com/rhovision-org/rholo/blob/e0b271ec93490b0133966c08697b63da1204047a/rholang/src/system_processes.rs#L398), [voucher subtraction](https://github.com/rhovision-org/rholo/blob/bc80abbba42661f0252c04f931e6a4ac58bb6737/qucalc/src/lib.rs#L650).

### D-03 — Ballots need validation by mode at the authoritative boundary

**Priority: P0. Evidence: executed client construction plus source-confirmed contract/native paths.**

The Issue contract's `cast` guard checks open status and voter/guest eligibility, then stores `choices` without checking canonical form. The bearer ballot minted by `enroll` also stores supplied choices without candidate validation. The native tally receives ballots and weights but no allowed-options set.

The approval native loops over the supplied vector and counts each occurrence. A list containing the same option three times therefore contributes three approvals from that identity. The normal checkbox UI does not create such a ballot, but other clients can. An unknown option can also enter the native candidate population without first appearing in the issue's options.

**Derived approval example:** A approves `[X, X, X]`; B and C each approve `[Y]`; all weights are 1. The inspected native loop counts X=3 and Y=2. Canonical set semantics would count X=1 and Y=2. This is an arithmetic/source witness, not a live native run. The client's actual `Gov.cast()` was executed with duplicate and unlisted strings and generated the term without rejecting them.

Estimates require a different validator. An executed `chamberPower` witness used `a=1e308` and `b=1`. The inputs pass `Number.isFinite`, but normalization multiplies by 100 first and overflows. The resulting share for a is `NaN`. Approval, rankings, argument endorsements and estimate ballots cannot safely share one permissive interpretation.

**Recommended fix:** a versioned ballot schema per mode. Approval choices are a bounded set of valid option IDs. Rankings are a bounded list of unique valid options. Endorsements refer to known argument IDs. Estimates contain valid chamber IDs and bounded numeric values represented without overflow. Invalid ballots must be rejected or excluded with an explicit invalid-data result; they must not silently become ordinary zero or empty support.

Validate in the UI for useful feedback, in the contract for durable state, and at the calculation boundary for legacy state and other clients. Candidate additions are an explicit separate operation today; ballot validation should not accidentally remove that documented policy.

**Required acceptance:** duplicates, unknown IDs, wrong types, oversized lists, empty ballots, malformed estimate entries, very large finite numbers, negative values, and the guest capability path. Reordering or duplicating an approval must not create extra voting power.

Sources: [cast and guest ballot](https://github.com/rhovision-org/rhogov/blob/fc4a4feac24107d7a667dffa1e4de95612ec7c50/src/chain/rgov-core.js#L771), [approval native](https://github.com/rhovision-org/rholo/blob/bc80abbba42661f0252c04f931e6a4ac58bb6737/qucalc/src/lib.rs#L720), [estimate normalization](https://github.com/rhovision-org/rhogov/blob/fc4a4feac24107d7a667dffa1e4de95612ec7c50/src/chain/council.ts#L113).

### D-04 — Council object discovery authenticates structure through a name prefix

**Priority: P1. Evidence: executed discovery witness and source-confirmed creation path.**

`councilsOf()` recognizes a stakeholder chamber from its ID prefix, not an authorized membership manifest. The executed witness supplied a council controlled by a facilitator and a child named `council-real.foreign` controlled by an outsider. The actual function included the foreign group as a chamber.

The UI offers “Add a stakeholder group” and “New decision” only to the facilitator. Those visibility checks are not an authority boundary: Group creation and Issue opening are public verbs. A different client can create a prefixed chamber or an issue indexed under an existing council's gid. `loadCouncil()` discovers these objects without validating an authorized list of children or decision openers.

This does not transfer the facilitator's key or an existing group's admin rights. It can contaminate the set of objects the council UI treats as belonging to the council. Before any estimates exist, adding a discovered chamber also changes the equal-share population. After estimates exist, a new uncovered chamber ordinarily has zero power, so the immediate numerical impact differs by state.

**Recommended fix:** keep councils interoperable, but give them a canonical, versioned manifest recording authorized chamber IDs, the weights issue, permitted facilitators and registered decisions. Store that manifest under authority anchored to the council, not a child ID chosen by its creator. Validate authorship of `.weights`, `.args` and other auxiliary objects. Unexpected prefixed objects can be shown as unrecognized records for inspection rather than promoted into the official council.

**Required acceptance:** an outsider-created prefix group, a foreign decision with the same gid, auxiliary ID preclaiming, authorized facilitator rotation, and a legitimate new stakeholder group. A hidden button is not the negative test; direct calls must be exercised.

Sources: [council discovery](https://github.com/rhovision-org/rhogov/blob/fc4a4feac24107d7a667dffa1e4de95612ec7c50/src/chain/council.ts#L64), [loader](https://github.com/rhovision-org/rhogov/blob/fc4a4feac24107d7a667dffa1e4de95612ec7c50/src/ui/council.tsx#L27), [facilitator-only UI](https://github.com/rhovision-org/rhogov/blob/fc4a4feac24107d7a667dffa1e4de95612ec7c50/src/ui/council.tsx#L462).

### D-05 — Floating-point comparison can turn a tie into a winner

**Priority: P1. Evidence: executed actual arithmetic functions.**

The council uses floating-point shares and exact equality/ordering to distinguish a tie. In the executed witness, powers were 10%, 20%, 30%, 40%. X received all support in the first two chambers; Y received all support in the third; the fourth contributed no support. Both mathematical scores are 3/10.

The actual output was X=`0.30000000000000004`, Y=`0.3`, winner X, no tie. Recording scores rounded to thousandths can then show equal stored numbers alongside a selected winner.

**Recommended fix:** specify the numerical policy and version it. Exact rational comparison is appropriate for bounded integer inputs; a fixed-point policy is also possible if rounding and tie resolution are explicitly agreed. Adding an arbitrary epsilon without specifying its effect on legitimate small differences is insufficient. Establish an independent verifier and shared vectors for every client combining stakeholder results.

**Required acceptance:** exact rational ties, near-ties on both sides of the policy's resolution, reordered chambers, sparse estimates, abstaining chambers, and serialization/record round trips. Equal mathematical inputs must receive the declared tie treatment.

Source: [chamberPower and combine](https://github.com/rhovision-org/rhogov/blob/fc4a4feac24107d7a667dffa1e4de95612ec7c50/src/chain/council.ts#L113).

### D-06 — The native capacity limit counts input records, not just people

**Priority: P1. Evidence: source-confirmed limit and derived capacity example.**

The native handler enforces `MAX_GOV_UNIVERSE = 512`, but its budget arguments include sums of input lengths:

| Function | Count used for the limit |
|---|---|
| trust | rating entries + admin entries |
| censure | censure entries + level entries + voucher entries |
| resolveWeights | direct voters + delegation entries + trust entries |

Consequently, “supports 512 people” would be an incorrect interpretation. For 23 participants with a directed rating for every other participant, there are 23×22=506 ratings. If standing produces 23 levels, the censure input reaches 506+23=529 records even with no censure entries, exceeding the handler limit. The exact operational threshold also depends on admins, graph density, phlo and other inputs.

The current cost function charges the square of the supplied count. UI pagination does not make an indivisible native calculation over an oversized graph fit this limit. It also should not be bypassed by calculating unrelated pieces and adding them if the policy is not decomposable.

**Recommended fix:** publish a supported envelope in terms of people, edges, ballots, candidates, argument sizes and phlo. Expose a preflight resource estimate and a distinct capacity error. Benchmark the native algorithms within that envelope, then optimize and independently validate a larger envelope if needed. Increasing the limit without memory/time/admission evidence is not an optimization plan.

Sources: [handler limits](https://github.com/rhovision-org/rholo/blob/bc80abbba42661f0252c04f931e6a4ac58bb6737/rholang/src/system_processes.rs), [current handler expressions](https://github.com/rhovision-org/rholo/blob/e0b271ec93490b0133966c08697b63da1204047a/rholang/src/system_processes.rs#L1273), [cost function](https://github.com/rhovision-org/rholo/blob/e0b271ec93490b0133966c08697b63da1204047a/rholang/src/accounting.rs#L125).

### D-07 — Inbox/4 bounds retained entries but not all history resources

**Priority: P1 for PR acceptance. Evidence: source-confirmed proposed/upstream code; execution pending.**

Inbox/4 is a useful improvement: per-owner history cells, owner-only self access, cursor pages, and removal of capabilities from archived message fields. The proposed vendor source matches upstream and its 103 structural checks pass.

The resource claim needs narrower wording and stronger enforcement:

- `dropOne` keeps `byFrom` and `byType` keys when their lists become empty. Over many distinct senders or types, those index dictionaries can retain more keys than the 500 retained entries suggest.
- Entry count does not bound the bytes of an individual message or subject.
- A page of at most 50 results can still scan a larger history and run substring checks against long subjects. Output size and work budget are different limits.
- `importHistory` checks that the destination is empty but does not visibly rebuild or validate all imported indexes, retention bounds and entry shapes.
- A signed history search is financially meaningful even if repeating it does not mutate a business fact. `receipt: false` may be reasonable for a carefully defined read policy, but it means fee-bearing uncertain requests are not represented by the durable write receipt mechanism.

**Recommended fix:** remove empty index buckets, validate and rebuild imported history, bound field and total-history bytes, and impose explicit scan/work limits with resumable continuation. Test high-churn histories and maximum-size fields. Keep capability-bearing messages and ordinary searchable history as distinct recovery guarantees.

Keep the local archive during the transition: pre-Inbox/4 messages, capability information, finite on-chain retention and legacy communities are not solved by adding a History panel. Present deletion as removal from the current index, not erasure of plaintext from all historical chain states. Do not expose owner-only data through a public read facet merely to make search faster.

Sources: [history indexes and deletion](https://github.com/rhovision-org/rhogov/blob/f7af35e21d19c7cf2bb377345015ec4912536260/src/chain/rgov-core.js#L202), [history import](https://github.com/rhovision-org/rhogov/blob/f7af35e21d19c7cf2bb377345015ec4912536260/src/chain/rgov-core.js#L597), [proposed UI](https://github.com/rhovision-org/rhogov/blob/f7af35e21d19c7cf2bb377345015ec4912536260/src/ui/inbox.tsx#L812), [upstream PR #255](https://github.com/rhovision-org/quantum-os/pull/255).

## 5. Reliability repairs

### 5.1 A write needs a durable state machine

The current `stillUnknown` classifier treats ordinary `NodeError` as a known outcome. A fetch failure after signing is not evidence that the node never accepted the request. The actual receipt witness saved a signature before POST and then demonstrated that the error path deleted it. The two-minute `NotCarried` inference is also too strong when status reads never established rejection. Install additionally relies on an `onSubmitted` callback that normally runs after the submission response and silently tolerates storage failure.

Use a journal with explicit states and evidence:

| State | Evidence required | Retry treatment |
|---|---|---|
| Draft | No signature exists | Safe to revise |
| Signed, send outcome unknown | Signature journal committed before transport | Preserve; reconcile by signature |
| Submission acknowledged | Node acknowledged receipt | Keep tracking; not equivalent to execution |
| Executed | Inclusion and result observed | Distinguish runtime success, business errors and partial multi-step outcomes |
| Finalized | Declared finality condition met | Mark final under the stated trust model |
| Definitively rejected | Protocol evidence of rejection/non-execution | Allow a deliberate new attempt |

Transport timeouts, 5xx responses, aborts and elapsed time alone must not erase a signed record. Record node/chain identity, signer address, action ID, target, signature, payload hash, state and relevant block references. Do not store the private key in the journal. Do not silently re-sign a new payload as a retry. Retransmission of the same signed payload should only be enabled after the node's deduplication semantics are verified. Exactly-once business behavior across devices additionally requires a contract-level idempotency policy.

Preserve the operation ID through recovery. Generating a fresh random group ID after an uncertain create makes it a new action as far as the existing lock is concerned. The UI needs to surface unfinished creation intents without treating every intentionally repeated name as a duplicate.

This is consistent with [RFC 9110 §9.2.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2): automatic retry of non-idempotent requests requires knowledge that repetition is safe or that the original was not applied.

Source: [RNode submission/outcome](https://github.com/rhovision-org/rhogov/blob/fc4a4feac24107d7a667dffa1e4de95612ec7c50/src/chain/node.ts#L201), [receipt cleanup](https://github.com/rhovision-org/rhogov/blob/fc4a4feac24107d7a667dffa1e4de95612ec7c50/src/ui/kit.tsx#L192).

### 5.2 Collection must acknowledge durable recovery

The normal collect flow consumes messages on chain and then calls a persistence helper that suppresses errors. Successful browser import tests do not cover that loss window. Preserve the received result in memory and in a recovery/export surface when storage fails; show durable success only after a verified commit.

IndexedDB is appropriate for structured archives and the journal. Commit the related local records in one transaction; use a supported durability setting appropriate to critical receipts, and handle abort/quota errors explicitly. A local transaction cannot make an on-chain consume and browser persistence atomic. That requires a recoverable protocol, retained delivery identifier/history, or explicit acknowledgement design. A UI storage preflight can reduce failures but cannot prove the later write will succeed.

Quota estimates are estimates. Persistent storage requests and strict durability options improve specific failure modes; they do not promise survival of user deletion, device loss or every browser implementation. Browser-only backup should not be advertised as complete data durability.

Sources: [collect](https://github.com/rhovision-org/rhogov/blob/fc4a4feac24107d7a667dffa1e4de95612ec7c50/src/ui/inbox.tsx#L143), [archive persistence](https://github.com/rhovision-org/rhogov/blob/fc4a4feac24107d7a667dffa1e4de95612ec7c50/src/state.ts#L431), [IndexedDB transactions](https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/transaction), [storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

### 5.3 Incomplete reads must stay incomplete

The existing stale-state banner is useful when the outer promise rejects. It cannot help when a nested request is caught and replaced by `null`, `{}` or `[]`. The executed witnesses confirmed both silent issue omission and conversion of an absent native answer into an ordinary empty outcome.

Use one result contract across reads:

```ts
type ReadResult<T> = {
  data: T;
  chainId: string;
  blockHash: string;
  finality: "provisional" | "finalized";
  fetchedAt: number;
  complete: boolean;
  failed: { target: string; reason: string }[];
};
```

This is a proposed interface, not an implemented change. Required native fields and response shapes need runtime validation before constructing it. A missing return value must remain distinguishable from a valid zero-vote answer. Avoid defaulting an unknown mode/status to a usable one at a trust boundary.

A failed chamber read must not become “the chamber abstained.” In the actual arithmetic witness, complete support gave Y 60%; replacing that chamber with null selected X with 40%. Finalization must require every required chamber and weight input to be complete at the same snapshot.

### 5.4 Snapshot and finalization need one coherent protocol

`closeAndRecord` closes the issue, then serializes `out` from the preceding render. A ballot arriving before close can be missing from that record. A successful close followed by a failed record deploy also leaves an incomplete operation.

The minimum repair is close → read the closed issue and relevant policy state at an explicit block → compute/verify → record → reconcile. Preserve a resumable operation across the two writes. The stronger design is a versioned finalize operation that validates preconditions and records an identified snapshot.

A final record should identify at least: decision/contract IDs, chain genesis, input block hash, finality policy, electorate and candidate-set digests, ballot/weight input digest, native calculation version, council combination version, result/tie disposition and recorder. A digest establishes what bytes are referenced; it does not by itself prove the calculation or chain state is correct. Preserve sufficient inputs for an independent verifier.

The Issue state machine should make final status terminal and results append-only or explicitly revisioned. `lock` must not silently replace closed status. A blanket ban on every post-close `propose` would break the current close-then-record flow, so compatibility needs an explicit first-record/finalize transition, not a local guard pasted into the old protocol.

Source: [close/record flow](https://github.com/rhovision-org/rhogov/blob/fc4a4feac24107d7a667dffa1e4de95612ec7c50/src/ui/votes.tsx#L150), [Issue transitions](https://github.com/rhovision-org/rhogov/blob/fc4a4feac24107d7a667dffa1e4de95612ec7c50/src/chain/rgov-core.js#L818).

### 5.5 One deploy does not imply all-or-nothing business semantics

`batchProgram` invokes the next operation after any answer. A logical `gov-error` is a returned value; the browser notices it only after the deploy. Earlier successful changes need not be undone, and later calls can still run. Simply stopping at the first error would still leave earlier changes.

For genuinely indivisible operations on one contract, use a domain verb that validates all prerequisites against the consumed state before publishing the final state once. For a multi-contract workflow, expose its steps and recovery status unless a verified coordination protocol exists. Preserve the distinction between runtime failure, contract business refusal and partially completed workflow.

Sources: [batch program](https://github.com/rhovision-org/rhogov/blob/fc4a4feac24107d7a667dffa1e4de95612ec7c50/src/chain/gov.ts#L331), [batch answer handling](https://github.com/rhovision-org/rhogov/blob/fc4a4feac24107d7a667dffa1e4de95612ec7c50/src/chain/gov.ts#L571).

## 6. Performance plan that preserves correctness

### 6.1 Measurements already established

| Controlled fixture | Observed behavior | Meaning |
|---|---|---|
| 20 simultaneous explores, cold tip cache | 20 tip requests + 20 explores | TTL cache lacks in-flight deduplication |
| 10 visible groups, 10 distinct issues each | 121 explores | 1 group list + 10 group reads + 10 issue lists + 100 issue reads |
| Same main build | 374.33 kB raw / 124.15 kB gzip | README's older 230/73 kB baseline is stale |

These are request counts and build sizes, not internet latency or node throughput benchmarks. The 121-call fixture excludes request groups, names, inbox counts, balances and repeated reads from other components.

`useAsync` already prevents overlapping polls within the same hook, ignores superseded completions, and keeps prior data during failed refreshes. Preserve those useful protections. The missing coordination is across hooks, screens and helpers. A forced refresh also needs controlled cancellation/supersession rather than allowing an unbounded sequence of old reads to continue.

### 6.2 Recommended read pipeline

1. **Acquire one read context:** chain identity, block hash, finality mode and compatibility information.
2. **Validate and schedule:** stable query key, bounded parallelism and byte/work budgets per node.
3. **Share in-flight work:** identical query/context pairs use one promise. Tip acquisition is shared before its response arrives.
4. **Cache by context:** chain + contract + query + block; explicitly invalidate affected targets after writes.
5. **Return coverage:** data and missing/failed targets, not success-shaped defaults.
6. **Render independent sections progressively:** inbox and balance should not wait for a complete issue enumeration when they can be read independently.

Start with a measured concurrency setting, for example 4, and compare 4/8 against a pinned fixture. Those are tuning candidates, not established safe limits. Share the workload for Home, name sync, PersonField and inbox watch. Avoid loading every other community's groups whenever a person picker mounts; use a scoped, refreshable directory cache.

Use paged summary reads for listings and fetch full membership, trust graph or ballots when the view needs them. A read-only aggregation query can reduce HTTP overhead, but it must have a bounded response/work budget and coherent snapshot. Replacing 100 small queries with an unbounded giant query merely moves the bottleneck.

Use adaptive polling keyed to visibility and observed chain change, with backoff and jitter on failure. Preserve prompt refresh after the user's write. Do not cache a transport failure as “no directory”; cache actual capability absence by genesis and revalidate on a network reset.

### 6.3 Measure the whole latency chain

Instrument locally and optionally export sanitized diagnostics. Separate initial rendering, tip lookup, explore time, native computation, balance/status preflight, signing, node acknowledgement, block inclusion, finality and UI reconciliation. UI optimization cannot reduce consensus latency by itself.

| Axis | Acceptance experiment |
|---|---|
| Reads | Fixed 1/10/100-group fixtures; count calls, bytes, queue delay, p50/p95 and peak concurrency |
| Governance graph | Sparse/dense rating and delegation graphs near the declared native record limits |
| Councils | 2/6/20 chambers with complete, missing and stale inputs; compare exact results |
| Writes | Response loss before/after acceptance, inclusion/finality delay, reload and repeat attempts |
| Storage | Normal, denied, near quota, abort, corrupted records and multiple tabs |
| Platforms | Desktop and Android; hosted HTTPS and supported file-open behavior |
| Networks | Disposable single-node baseline, then source-pinned multi-validator acceptance |

Initial targets: one tip request for the 20-read cold fixture; one in-flight execution for an identical query; an enforced concurrency ceiling; at least a 50% request-count reduction in selected repeated-read fixtures; and zero changes to valid governance results. The 50% figure is a proposed target, not an achieved speed claim. Select latency targets after collecting a baseline on declared hardware and network conditions.

### 6.4 Upstream scaling

Group and Issue state currently use shared cells at the community-contract level. This is a potential serialization point for writes across otherwise independent groups/issues. HTTP explores execute on read-only evaluation state; they should not be described as consuming the live contract cell.

After removing client amplification, benchmark whether shared write state is actually the limiting factor. If so, investigate state partitioned by group/issue with bounded indexes and explicit migration. Keep policy outside storage contracts where intended, while enforcing data integrity and capability boundaries. Do not assume native limits disappear when state is partitioned: a single decision may still require a global graph calculation.

## 7. State isolation, identity and deployment security

### 7.1 Chain and asynchronous scope

`communityKey` is only the Group URI. The executed collision witness replaced the remembered community when another synthetic chain reused that URI. Archive and membership storage inherit parts of this scope. Use a versioned identity based on chain/genesis and the relevant contract addresses; distinguish that identity from an endpoint URL so legitimate endpoint moves do not accidentally create another logical network.

There are two additional executed failures:

- A failed genesis request still sets `chainChecked=true` with no known genesis. Separate attempted, verified, unreachable and mismatched states. Automatic writes should require the state their policy actually promises.
- A delayed inbox read from A completed after switching to B and wrote count 7 into B's display and seen record. Capture the full node/genesis/community/key context before awaiting, and reject completion after its epoch changes. Apply the existing directory epoch pattern consistently to other asynchronous helpers.

Use cross-tab coordination for the journal and archive. [Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API) coordinate cooperative contexts in the same origin; they do not establish cross-device idempotency or protect against a malicious same-origin script. Feature-detect and test each supported deployment mode. A lock plus an atomic IndexedDB journal transition is preferable to a localStorage check-then-write race.

### 7.2 The signing identity shares the application's origin

The active private key is stored in localStorage; exporting an encrypted keystore does not encrypt that active storage. The declared GitHub Pages URL is a project path under `rhovision-org.github.io`. By browser origin rules, sibling paths on the same origin share localStorage. `/rhogov/` is not an isolation boundary from another application on that host. This is a consequence of the hosting/storage design, not evidence that a sibling application is malicious.

For valuable identities, prioritize a dedicated origin, an explicit unlocked session, encrypted storage at rest with auto-lock, and verified backup/restore. Consider external signing support when its protocol and threat model can be properly implemented. Worker isolation can reduce accidental direct access, but a compromised frontend may still request signatures. Do not market local encryption as protection against every active-origin compromise.

Generate and verify release checksums. Test a strict content policy against the actual inline scripts, inline styles and file distribution model before enforcing it. A content policy in this document cannot isolate storage from a different page that is already trusted within the same origin; the origin boundary must be fixed independently.

This recommendation follows [OWASP's storage/origin guidance](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage). For the disk-open mode, [MDN documents that localStorage behavior for file URLs is not standardized](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage#description). Portability needs feature checks, a supported-browser statement and a reliable recovery/export path.

### 7.3 Preserve useful existing defenses

The client derives/signs identities locally; it does not trust a typed sender field for on-chain messages. The Markdown renderer creates elements rather than injecting HTML and applies a restricted web-link policy. Keystore files have encryption and integrity checks. Name-scope tests cover several late-response cases. These are worth retaining.

Strengthen import limits, KDF cost bounds, cancellation, sensitive-memory lifetime and restoration behavior on Android. Do not weaken the output KDF merely to make a test faster. Treat node responses, imported records and storage contents as runtime trust boundaries even when TypeScript types are present.

A malformed route segment also caused an executed `URIError`. Catch invalid route decoding and render recovery navigation. This is a robustness repair, not a demonstrated takeover.

## 8. Release assurance and PR #109

### 8.1 Deploy the artifact that passed the gates

Main's Pages workflow builds and publishes independently of the workflow running `npm test`. A failed test workflow therefore does not itself prevent that deployment. The branch API reported `protected: false` and the repository ruleset list was empty. The detailed protection endpoint was inaccessible to the integration, so no conclusion is made about every organization or environment control outside the inspected record.

Use a pipeline in which tests and a bounded disposable-node smoke test must pass before publication. Build once, test that artifact, record its digest, and deploy that same artifact. Use narrow token permissions, pin external actions and the node/core dependency to reviewed commits, and preserve provenance. A floating quantum-os checkout makes native compatibility failures harder to reproduce.

[GitHub's job dependency mechanism](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-jobs#defining-prerequisite-jobs) and [workflow artifacts](https://docs.github.com/en/actions/tutorials/store-and-share-data) support this structure. If separate workflows are retained, validate the trusted event, source SHA and artifact digest at the privileged deployment boundary. Do not consume untrusted PR artifacts in a privileged workflow without those controls.

Nightly playground coverage is useful as an environment canary. A playground failure with a green local fixture narrows the investigation; it does not prove the product cannot be at fault. Preserve failing traces and the actual environment difference.

### 8.2 Fix the #109 negative assertion before relying on its green result

The audited diff changes the storage-refusal test's deploy counter to count only requests containing `Reviewed club`. That test creates `Refused club` and performs `leave`, whose term is based on the group ID. An erroneous leave deploy will not match the counter. The assertion can therefore report zero even if the forbidden write is sent.

Match the precise signer/verb/target for the action being tested. Prove the test's sensitivity with a negative control that deliberately emits that action and must fail the assertion. For the review test, distinguish the target action from background name publication rather than counting every network write.

PR #109 should additionally cover: no history on legacy contracts; correct feature disclosure before search; cursor boundary behavior; concurrent search results arriving out of order; deleting while another page is loading; retention/index churn; byte/KDF-independent resource limits; and invalid imported history. New UI panels should not claim every old community already keeps a history before capability detection has answered.

Sources: [audited PR diff](https://github.com/rhovision-org/rhogov/pull/109/files), [pinned test](https://github.com/rhovision-org/rhogov/blob/f7af35e21d19c7cf2bb377345015ec4912536260/tests/e2e/pending-writes.spec.ts#L79).

### 8.3 Compatibility is per contract and per native generation

`hasV4Contracts()` infers the Group generation from an Issue read because the normal installer deploys them together. Manual contract entry can supply a mixed triple. Feature support should therefore be identified independently for Inbox, Group and Issue, and bound to chain identity and native version.

Publish a small compatibility matrix: client build, native source/binary identity, each contract version/URI, supported features, and migration state. Keep old contracts readable. New guards do not retroactively upgrade old deployed instances. A governance-approved migration must name old/new URIs, validate transferred facts, preserve the old record, and prove the supported return/recovery path. Do not silently rewrite histories or clear browser data as a migration strategy.

Correct the stale size/selftest claims and reconcile audit probes that are still excluded as “red by design” after their findings were marked fixed. Fixed probes should become regular regression evidence, with any remaining exclusions explicitly justified.

## 9. Policy decisions that engineering must not silently invent

The following choices need an explicit owner and versioned policy. They should be resolved alongside the implementation, not hidden in an optimization.

| Decision | Why it matters |
|---|---|
| Electorate for delegated weight | Direct eligibility and contributing eligibility must not diverge accidentally |
| Membership and power snapshot time | New members, ratings and estimates can otherwise change a running decision |
| Trust domain and voucher stake | A slash must not increase authority; raw and effective stakes differ |
| Candidate changes during voting | The UI currently permits suggestions; the canonical ballot must still name valid candidates |
| Quorum, abstention and missing chambers | A numeric leader alone does not establish a sufficient mandate |
| Tie rules | Native lexicographic tie resolution and council no-winner ties are distinct policies |
| Facilitator authority and amendments | A recorded override needs an authorized author and visible rationale/version |
| Name uniqueness | Community labels and network-wide first-claim ownership have different costs and squatting risks |
| Identity and Sybil resistance | A key is not proof of a unique person or of being a validator/token holder |
| Privacy and deletion | Contract access control and current-index deletion do not encrypt or erase historical plaintext |

For names, [issue #4](https://github.com/rhovision-org/rhogov/issues/4) remains a policy question. Community-scoped names with provenance and disambiguation are a practical low-cost baseline. Network-wide uniqueness needs an upstream ownership/index and migration policy.

For the playground directory, [issue #5's latest evidence](https://github.com/rhovision-org/rhogov/issues/5#issuecomment-6444017075) reports the reset and compatible build, but explicitly leaves direct lookup confirmation outstanding. This review did not perform that live check. The numeric censure threshold should likewise be exposed from the authoritative native query rather than independently reimplemented in UI copy.

Follow-up action items currently carry text. If execution tracking becomes a real need, add owner, due date, evidence and completion state under a compatible schema. Do not expand the governance scope into treasury execution or automated enforcement before the authorization and finalization boundaries are proven.

## 10. Proposed implementation sequence

These are proposed implementation packages. This documentation submission implements none of them. S/M/L describe scope, not promised elapsed time.

| Package | Scope and owner boundary | Dependencies | Size | Exit evidence |
|---|---|---|---|---|
| A. Canonical electorate and inputs | Shared query/native spec; quantum-os guards; rhogov validation (D-01/02/03) | Policy for E, modes and trust values | L | Outsider/duplicate/negative inputs cannot change a valid decision |
| B. Durable action journal | rhogov receipt classifier, install path, recovery and multi-tab coordination (F-01/14) | Stable action identity | M | Response loss + reload retains each signature and prevents unintended resubmission |
| C. Recoverable collection | rhogov storage errors and Inbox/4 recovery contract (F-02, D-07) | Journal and retention contract | M–L | Quota/crash tests preserve a recoverable result |
| D. Typed snapshot reads | rhogov coordinator, schemas, completeness and scope epochs (F-03/07/08/09/13/14) | Chain identity and query schema | M–L | One snapshot, bounded work, explicit partial data |
| E. Council authority and arithmetic | Versioned manifest and numerical policy (D-04/05) | A and policy agreement | L | Foreign objects excluded; exact tie and verifier vectors pass |
| F. Finalization protocol | quantum-os terminal transitions, domain operations, rhogov resumable recording (F-04/05/06) | A, D, E | L | Record reproducible at the named snapshot; partial operation recoverable |
| G. Release and compatibility gates | rhogov workflow, #109 test repair, pinned localnet and feature matrix (F-11/12/16) | Can start immediately | M | Deployment consumes the accepted artifact at the accepted SHA |
| H. Identity isolation and measured scaling | Dedicated origin/vault options; supported capacity and graph benchmarks (F-15, D-06) | Explicit platform/threat envelope | M–L | Restore/security matrix and resource-bound evidence |

Start A and G as specification/test work while B and C address demonstrated data-loss windows. Begin D with tip/request deduplication and explicit completeness, then add aggregation/pagination against measured fixtures. Do not wait for a complete UI redesign to repair these boundaries.

Changes to vendored contract semantics belong in quantum-os, followed by a pinned re-vendor into rhogov. Changes to native policy/resource semantics belong in Rholo. Client-only defensive improvements should be described as client protections until the shared protocol boundary also enforces them.

## 11. Acceptance specification

| Invariant | Required witness and negative control |
|---|---|
| Eligible weight | Add outsider/departed/non-roll records; result unchanged unless policy explicitly admits them |
| Canonical ballot | Duplicate/unlisted/malformed choices rejected; direct custom client exercises the contract guard |
| Monotone censure | Valid censure never increases a level; negative raw stakes rejected or deterministically neutralized |
| Authenticated council | Foreign prefixed groups/decisions do not become canonical children |
| Numeric reproducibility | Rational ties and near-ties agree across clients and the independent verifier |
| Complete result | One failed chamber yields incomplete status and blocks finalization |
| Snapshot consistency | Tip changes during loading do not mix blocks within the accepted decision input |
| Recoverable signature | Cut the response after acceptance; reload; reconcile the same signature without silently issuing a new action |
| Durable collection | Quota denial/crash does not produce a success claim while losing the received message |
| Workflow semantics | A logical error in step two shows the actual partial outcome or leaves an atomic domain state |
| Terminal finality | Closed→lock→setRoll and final-record overwrite are refused under the new state machine |
| Scope isolation | Delayed replies after node/genesis/community/key changes cannot update the new scope |
| Bounded resource use | Dense graphs, field lengths, history churn and imports stay inside declared budgets or fail explicitly |
| Deployment integrity | A deliberately failing required check prevents publication of that artifact |

Run pure/unit and property-based checks first. Then execute adversarial contract/native cases on a disposable chain using throwaway keys. Cross-client tests must send protocol inputs directly, because ordinary UI controls hide several important invalid-input paths. Add restart/restore, legacy/new contract combinations, and the real supported Android/browser modes.

Use mutation or deliberate negative controls to show each safety assertion can fail. Preserve SHA, contract generation and URIs, node binary digest, genesis, test fixture, command, signatures, included/finalized hashes, raw output and trace. Record skipped tests and unresolved claims explicitly. Formal checks can target the state machine and bounded arithmetic, but a proof of an abstract model must be paired with implementation conformance and runtime evidence.

Do not run hostile workloads against public communities as a substitute for a disposable test environment.

## 12. Executed witness register

All sixteen entries below executed project client functions or builders with fixtures. They do not claim execution of the Rholo native binary or of a deployed Rholang contract.

| Witness | Result |
|---|---|
| E01 — transport error after signature | Receipt saved before fetch, then removed by `act`; pending record null |
| E02 — routine review exception | Review preference true; routine callback permitted signing; no review modal |
| E03 — incomplete chamber | Full result Y=0.6; missing B result changed leader to X=0.4 |
| E04 — partial issue enumeration | One of two known issue reads failed; returned list omitted it without an error marker |
| E05 — archive quota failure | No exception reported; zero new messages persisted |
| E06 — concurrent cold tip | 20 tip requests and 20 explore requests |
| E07 — community scope collision | Same Group URI on a second synthetic chain replaced the first remembered community |
| E08 — input construction | Normal rating API clamps negatives; raw builder can express a negative; cast builder accepts duplicate/unlisted choices |
| E09 — council provenance | Actual discovery included `council-real.foreign`, administered by an outsider |
| E10 — tie arithmetic | Equal rational support returned X=0.30000000000000004, Y=0.3, winner X |
| E11 — missing native answer | Empty reply returned ordinary `{weights: {}, winner: null, ballots: {}}` |
| E12 — failed genesis check | `chainChecked=true` while known genesis remained null |
| E13 — late inbox response | Active community B received count/seen=7 from A's delayed request |
| E14 — list request count | 10 groups and 100 distinct issues produced 121 explores |
| E15 — malformed hash route | Route decoding raised `URIError` |
| E16 — estimate overflow | Finite input `1e308` generated council share `NaN` |

The native examples in D-01, D-02 and D-03 are explicitly source-derived. Their signed deployment and end-to-end effects remain acceptance work. The native resource limit example is a source-derived budget calculation. Inbox/4 index/byte behavior remains source analysis. No p95 latency, TPS, concurrent-user capacity, real-world exploit frequency, or measured speedup is asserted.

## 13. References and review disposition

Primary repository references are pinned inline. The main external engineering references are:

- [RFC 9110 — idempotent methods and retry semantics](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2).
- [MDN — IndexedDB transactions and durability options](https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/transaction).
- [MDN — storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).
- [MDN — Web Locks and same-origin coordination](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API).
- [MDN — localStorage and file URL behavior](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).
- [OWASP — local storage and origin boundaries](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage).
- [GitHub — prerequisite jobs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-jobs#defining-prerequisite-jobs), [artifacts](https://docs.github.com/en/actions/tutorials/store-and-share-data), and [secure action use](https://docs.github.com/en/actions/reference/security/secure-use).

These sources support the storage, retry, isolation and release design principles. The specific architecture, priorities, test gates and proposed interfaces are recommendations derived from rhogov's code and goals, not claims that those references certify rhogov.

**Review disposition:** preserve the architecture, repair the authorization/input and recovery boundaries, bind decisions to complete identified snapshots, and make publication depend on evidence for the exact artifact. Then optimize and expand the supported envelope using measurements. Existing green tests are useful evidence for their cases; they do not close the new adversarial cases or the live acceptance work listed here.
