# QuantumOS → RhoGov success-charter/1 handoff (#291)

## Protocol and acceptance boundary

QuantumOS off-chain ratifies a proposed group charter; RhoGov records the **exact signed artifact** through its **existing Issue/4 contract on Rholo**. No change to node consensus or a new governance identity system is required.

**This implementation offers a concrete interoperable proposal record, not an automatic certification that a multi-stakeholder vote was ratified.** RhoGov Issue/4 records votes, a frozen roll, and an opener's claimed result; it does **not** itself prove that a charter was approved under every council's voting rules. That requires the independent native tally and policy verification before `approved`/`rejected` promotion.

## Immutable mapping

- The canonical payload is QuantumOS `success-charter/1`, built by the existing `success-charter.ts` implementation, with `charterHash = SHA-256(canonical JSON of content)`; `charterHash` and top-level `signatures` are excluded from that digest.
- The stable Issue/4 id is `success-charter-<64-lowercase-hex-hash>`.
- `Issue.title` is `qos/success-charter/1:` followed by `encodeURIComponent(canonicalJson(the exact signed artifact))`. This stores the *whole* payload and signer set, not only a hash or an external URL.
- `Issue.gid` is the exact QuantumOS group id; `mode` = `approval`, `options` = `["approve","reject"]`. Only one `open` call is made after checking that the id is absent.
- `Issue/4 open` is idempotent **by id only**, not by title: an `already` answer is insufficient. Every retry first reads the immutable record and checks title bytes, hash, group and options. A mismatch is a blocking conflict.
- A submitted deploy whose fate is unknown **must not** be resent automatically. Query the same id until it is visible or resolve the uncertainty explicitly.

## Handoff authorization and identity

- QuantumOS requires a closed group approval Poll, a strict approving majority, a recorded dyncap anchor, membership and on-chain Group/4 admin status, plus a **human confirmation** previewing the exact artifact and target before signing.
- The signer uses the existing funded **REV deploy wallet**; a compact secp256k1 signature covers domain-separated `SHA-256("qos:success-charter/1:handoff\\n" + charterHash + "\\n" + anchor)`. A signature field is `sc1:<anchor>:<compressed-public-key-hex>:<compact-signature-hex>`.
- Readers verify the signature and ensure that the signer wallet's derived REV address is a recorded RhoGov member and admin. The dyncap anchor↔wallet mapping in the room is still **self-asserted/TOFU**; a valid wallet signature is not a formal cryptographic proof of the hidden dyncap seed.
- The room bearer secret `cap:room:…`, goals, private notes and unshared personal artifacts must not be placed on chain. The title is **public data** after inclusion.
- RhoGov exposes `Gov.handoffSuccessCharter` (requires a review callback) and `Gov.successCharterStatus` through `src/chain/gov.ts`. Plain read and canonical checks are in `src/chain/success-charter.ts`.

## Read-only status semantics

| Observation | API status | Meaning |
|---|---|---|
| No Issue/4 record | `unknown` | No on-chain record independently found; not permission to auto-resubmit |
| Record open or locked, title/hash valid | `pending` | Exact signed artifact has a proposal record |
| Record closed, opener claims success | `unknown` | Native tally and council policy have not been independently verified |
| Validated independent native tally + policy approval | `approved` **future gate** | Not inferred by this implementation |
| Validated independent native tally + policy rejection | `rejected` **future gate** | Not inferred by this implementation |

The API and the Group metadata preserve the proposal ID, content hash, Issue registry URI and observed read-block hash. A latest-block read may be reorgable; inclusion is **not** proof of finality or of the charter's multi-stakeholder ratification.

## Cross-repository evidence

Both repositories include the **byte-identical** `contract/success-charter-1-vector.json` (fixture SHA-256 `c4412739985985792725b1a6a783777365741c306ca0e98c3114399e92f97985`). QuantumOS tests the signer/validator, canonical Issue mapping, duplicate and forged-signature rejection. RhoGov tests the same hash/id/title and validation of an independently derived REV address. Integration must additionally exercise a **real disposable Rholo node** with Group/4 and Issue/4 installed, followed by an accepted signed opening deploy and read-back of the exact record; public four-validator Rholo #584 is out of scope.

## Non-promotion conditions

A green TypeScript build, a signed deploy accepted by the node, or an `Issue/4` record with status `closed` **does not close #291**. Completion requires demonstrated source-to-installed-binary provenance, exact read-back after inclusion, independent ballot/quorum/tally verification, verified chain finality where required, and a genuine human/group authorized handoff from a browser. Do not mark cross-repo chain governance as complete based solely on a mock or fixture.
