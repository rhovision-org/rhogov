# MrE Profile A — RhoGov read-only integration boundary

Tracking: rhogov #119, quantum-os #260 and #318, QLF #221.

This increment introduces a **transport interface**, not a second implementation of MrE. `src/chain/mre-adapter.ts` requires a caller-injected native/WASM binding and rejects invocation when one is absent. It validates canonical rational serialization on inputs/outputs, tags the QLF fixture provenance, and returns `appliedToTally: false`. No production UI, group configuration, vote weight, tally, or on-chain contract is changed. Passing the serialization check does **not** independently authenticate or prove the correctness of a native response; only a pinned, verified binding with conformance tests can provide that assurance.

The matching exact-rational binary posterior computation is implemented in quantum-os PR #318, not here. The QLF Profile A test vectors are pinned there. The wider #119 requirement (temperature/constraints, calibrated trust, correlated-vouch discounting, uncertainty, community opt-in, native tally parity and side-by-side view) is **not complete** and must not be enabled based on this adapter.

Release gates: (1) merge/pin core crate and a callable WASM/native binding; (2) verify binding against QLF fixtures; (3) agree Profile B temperature/constraints; (4) implement side-by-side preview and opt-in on-chain; (5) prove native tally parity; (6) independent review. Until then default integer trust weights remain unchanged.

## Actual Rust-to-RhoGov native conformance

`src/chain/mre-native-node.ts` is a Node-only, caller-configured process transport to the real `mre-profile-a` Rust executable. It never runs a shell, has bounded stdout/stderr, rejects nonzero exit codes and malformed JSON, and is not imported into the browser UI. `tests/mre-native-integration.test.ts` checks all 12 upstream vectors through the actual Rust process and the read-only RhoGov preview adapter, including a negative domain test. `.github/workflows/mre-integration.yml` pins the **unmerged** quantum-os #318 commit `2ee7ed6dc7190ecfab07d9d857d8aee868de0c1a` and SHA-256-verifies the QLF fixture before building. The pinned commit must be updated only through a reviewed cross-repo change after the upstream PR changes or merges.

This does not provide browser/WASM execution, on-chain opt-in, or vote-weight activation.
