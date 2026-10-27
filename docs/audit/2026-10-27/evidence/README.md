# Offline client witness reproduction

These diagnostics accompany the [27 October governance review](../README.md).
They execute actual client functions against synthetic inputs and browser/transport
fixtures. They reproduce the audited behavior, including defects. Passing these
assertions is evidence that the behavior reproduced; it is not a product acceptance
result. Repairs should receive regression tests for the required safe behavior.

## Baseline and commands

Audited application source: `fc4a4feac24107d7a667dffa1e4de95612ec7c50`.
The documentation branch adds these files on top of that source. The captured
outputs were reproduced with Node v24.22.1 and the locked dependencies. The project
CI uses Node 22; that runtime was not separately exercised for these scripts.
From the repository root:

```sh
npm ci --ignore-scripts --no-audit --no-fund
node --import tsx docs/audit/2026-10-27/evidence/main-client-witnesses.mts
node --import tsx docs/audit/2026-10-27/evidence/additional-client-witnesses.mts
```

Run each script in a separate process, as above. Both provide their own in-memory
storage, browser globals and synthetic transport before importing project modules.
No running node, funded key or browser profile is required. The constant signing
key is a disposable fixture. All URLs use reserved `.invalid` domains, and fetch is
replaced before imports; the scripts send no network requests. Dependency
installation is separate from diagnostic execution.

## Witnesses and captured output

| Script | Register entries | Captured output |
|---|---|---|
| [main-client-witnesses.mts](main-client-witnesses.mts) | E01–E07 | [main-client-results.json](main-client-results.json) |
| [additional-client-witnesses.mts](additional-client-witnesses.mts) | E08–E16 | [additional-client-results.json](additional-client-results.json) |

The first output records E01–E07 in register order. E01 explicitly checks that the
signed receipt exists when the simulated transport is called, then checks that the
error path removes it. The fixture does not establish acceptance by a real server.
E06 uses asynchronous synthetic responses to exercise concurrent cold-tip reads.
E14 counts actual query-builder calls against a declared 10-group, 100-issue fixture.
Neither fixture measures network latency or production capacity.

The second script includes the positive rating clamp check as well as invalid
ballot construction, council discovery/arithmetic, missing-data, scope and routing
cases. Each script exits nonzero if an assertion no longer matches. A future repair
can therefore make a diagnostic fail for the right reason; review the changed
behavior instead of weakening the assertion to keep this historical fixture green.

## Limits

These are client diagnostics, not native execution or full Rholang contract tests.
The native electorate, voucher subtraction, ballot tally and resource-budget cases
remain source-derived in the report. The proposed Inbox/4 paths in PR #109 also
require their own contract/runtime acceptance. The browser globals are fixtures;
real storage eviction, process crashes, cross-tab coordination, Android behavior
and deployed-chain finality require the separate campaigns specified in the report.
