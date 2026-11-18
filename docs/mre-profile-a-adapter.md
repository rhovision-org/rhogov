# MrE Profile A — RhoGov read-only integration boundary

Tracking: rhogov #119, quantum-os #260 and #318, QLF #221.

This increment introduces a **transport interface**, not a second implementation of MrE. `src/chain/mre-adapter.ts` requires a caller-injected native/WASM binding and rejects invocation when one is absent. It validates canonical rational serialization on inputs/outputs, tags the QLF fixture provenance, and returns `appliedToTally: false`. No production UI, group configuration, vote weight, tally, or on-chain contract is changed. Passing the serialization check does **not** independently authenticate or prove the correctness of a native response; only a pinned, verified binding with conformance tests can provide that assurance.

The matching exact-rational binary posterior computation is implemented in quantum-os PR #318, not here. The QLF Profile A test vectors are pinned there. The wider #119 requirement (temperature/constraints, calibrated trust, correlated-vouch discounting, uncertainty, community opt-in, native tally parity and side-by-side view) is **not complete** and must not be enabled based on this adapter.

Release gates: (1) merge/pin core crate and a callable WASM/native binding; (2) verify binding against QLF fixtures; (3) agree Profile B temperature/constraints; (4) implement side-by-side preview and opt-in on-chain; (5) prove native tally parity; (6) independent review. Until then default integer trust weights remain unchanged.
