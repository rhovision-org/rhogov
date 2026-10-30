# RhoGov process orchestration: councils

**Status: partly built, on trial.** Trust gates are live
([`src/chain/gates.ts`](../src/chain/gates.ts)): a council decision's phases now move on by
themselves. Loading a council definition (load, check, create, create later, export) is built
([`src/chain/definition.ts`](../src/chain/definition.ts)), without power rules, templates or
rules of change yet. The rest of this page is a design for review by the project's maintainers. The
only decision it asks for now is how a council decides, including how it changes the way it
decides. Everything else waits until a council actually needs it.

This is the process-orchestration layer for RhoGov. It builds on the
[Multi-stakeholder councils](../README.md#multi-stakeholder-councils) section of the README and
its "stored as" table, and on
[section 9 of the user guide](user-guide.md#9-councils-decisions-across-stakeholder-groups). It
meets the first implementation requirement of rholo's
[multi-stakeholder governance](https://github.com/rhovision-org/rholo/blob/dev/docs/src/qucalc/multi-stakeholder-governance.md)
design: a process orchestration framework. It keeps the principles in
[CLAUDE.md](../CLAUDE.md): serverless, no policy in a contract, councils as conventions over
the three [rgov-core](https://github.com/rhovision-org/quantum-os/blob/main/RGov_Core.md)
contracts.

## What councils are today

A council is already built from parts, but the parts are fixed in code
([`src/chain/council.ts`](../src/chain/council.ts), [`src/ui/council.tsx`](../src/ui/council.tsx)).

| Part | Today | Stored as |
| --- | --- | --- |
| Council | Everyone taking part | Group `council-<slug>` |
| Chamber (stakeholder group) | Own admins, trust, delegation, censure | Group `<councilId>.<slug>` |
| Chamber power | Median of participants' normalised estimates | Issue `<councilId>.weights` |
| Decision | Approval vote | Issue in the council, mode `approval` |
| Deliberation | Pros and cons per option, endorsed | Issue `<decisionId>.args` |
| Phase and record | Prepare → Deliberate → Decide → Record; Deliberate and Decide move on by their gates | Facilitator's entry in `results` (plus a `hold`) |
| Combination | Σ chamber power × chamber's weighted approval share | Computed in the browser |

Within each chamber, weights and the winner come from the node's `rho:gov:*` natives. Chamber
power and the cross-chamber score are browser arithmetic, labelled as recomputed
([RT-10](audit/register-redteam.md)).

## The gap

- **One process.** `PHASES` and `DECIDE_GATES` are constants. A budget split, an appointment,
  a charter change and a sign-off all need different steps, instruments and gates.
- **Gates are not latched.** Phases now move on by their gates, but the advance is derived in
  each browser, not written on chain, and no gate can use time yet (see below).
- **No sequencing between decisions.** Action items are text; nothing turns one into the next
  decision or refers a question to another council.
- **Combination is fixed.** "Every chamber must agree" cannot be expressed.

## Reusable components

| Component | Its one job | Built on | Today |
| --- | --- | --- | --- |
| **Body** | People with admins, trust, delegation, censure | Group + `rho:gov:*` | Council and chamber groups |
| **Power rule** | How much each chamber counts | Issue (estimate) or fixed shares | Median estimate only |
| **Instrument** | One way to gather input: approval, ranked, estimate, pros/cons, sign-off | Issue, one mode each | Approval, estimate, args |
| **Combiner** | Per-chamber outcomes → one council outcome | Pure function | Weighted sum only |
| **Gate** | A condition that must hold before a phase advances | Predicate over chain state | Built: [`gates.ts`](../src/chain/gates.ts) |
| **Record** | Outcome, rationale, dissent, actions | Issue `results` | Facilitator's entry |
| **Link** | Ties a record to what follows | A field naming the next issue | None |

A **phase** binds instruments, the gates that end it, and who may advance it. A **process
template** is an ordered list of phases plus a combiner. Nothing here adds a contract, and no
tallying moves out of the natives.

## The council component: deciding how we decide

A **council definition** is one file loaded in rhogov's browser app. It carries:

- **Councils and chambers:** the whole hierarchy below, each with name, slug, join policy and
  first admins.
- **Power rule:** median of estimates, or fixed shares.
- **Templates:** the processes the council may run, starting with Decide.
- **Rules of change:** which template governs changes to the definition, and the founding rule
  that applies before any chamber has members.

rhogov then:

1. **Loads** it: the file stays in the browser; only the deploy reaches the node.
2. **Checks** it and shows in plain words what will be created and what it costs.
3. **Creates** the structure in one `Gov.batch` deploy and records the definition's hash on
   Issue `<councilId>.definition`.
4. **Exports** any running council as a definition, which is what makes it reusable.

Changing the definition later is just another decision under the template its rules of change
name. How we decide is settled once, and then changes only by its own rule.

**Built so far** ([`src/chain/definition.ts`](../src/chain/definition.ts); Councils →
**Load a template…**): councils and chambers with a `parent` and a `later` flag, checked before
signing, created in two deploys (one for all the groups, one for the voting-power estimates
and the `.definition` records), councils marked `later` created from their parent's page, and
**Export as a template** on any council. The built-in rholo template is a starting point. Power
rules, process templates and rules of change are not in the format yet. The format today:

```json
{"kind": "rhogov-council-definition", "version": 1, "name": "rholo governance",
 "councils": [
  {"slug": "rholo-network", "name": "rholo Network Council", "purpose": "…",
   "chambers": [{"slug": "validators", "name": "Validators", "policy": "invite"},
                {"slug": "users", "name": "Users", "policy": "open"}]},
  {"slug": "rholo-treasury", "name": "Treasury", "parent": "rholo-network", "later": true,
   "purpose": "…", "chambers": [ … ]}]}
```

## Councils for rholo governance

Each stakeholder group in the rholo design gets a council, and each comes with sub-councils
for the issues that group is likely to meet. The whole set is **one component**. The Network
Council and the stakeholder councils are created at upload; each sub-council the first time a
question of its kind is raised. A question touching more than one group goes to the Network
Council, whose chambers are the stakeholder councils' delegates, and where the median power
estimate weighs the groups (including the design doc's wish, footnote [c], that validators
weigh more).

| Stakeholder council | Issue sub-councils | Typical questions |
| --- | --- | --- |
| **Validators** | Admission, Rewards and slashing, Node upgrades, Incidents | Who may validate, slashing cases, coordinating an upgrade, responding to an attack |
| **Developers** | Protocol proposals, Releases, Grants and bounties | Which changes go into rholo, release timing, funding work |
| **Users** | Fees, Disputes, Privacy | Fee levels, recovering from mistakes, what is public |
| **Token holders** | Treasury, Token policy | Budgets, supply and issuance, staking rewards |
| **Service providers** | Integration standards, Listings | Wallet and exchange standards, the names and token directories |
| **Governance stewards** | Appointments, Charter, Censure appeals | Facilitators and delegates, changes to the component, appeals |
| **Regulators** (advisory) | Compliance liaison | AML, data protection, consumer protection |

Five rules make it a hierarchy rather than a chain of command:

1. **Subsidiarity.** A question is decided by the lowest council whose scope covers it.
2. **Double links.** Each child elects a delegate who sits in the parent as a chamber; the
   parent appoints a lead who sits in the child, as in RGOV's sociocratic model
   ([quantum-os `Governance.md`](https://github.com/rhovision-org/quantum-os/blob/main/Governance.md)).
3. **Scope is granted down.** A child's definition names its parent and scope; a child cannot
   widen its own scope.
4. **Referral up.** A question outside a council's scope, or one it deadlocks on, goes to the
   parent through a Link.
5. **Seats from anywhere.** A council is itself a stakeholder group, so any council can seat any
   other group in the tree as a chamber. These cross-links are the redundancy: no single council
   is the only path for a group's voice. A seat is a reference, not a copy; `Gov.chamberOutcome`
   already computes any group's weights, so no chain change is needed. Seating needs both
   sides: the council proposes it and the seated group accepts it.

## Gates and orchestration

A phase moves on by itself when its gates hold, so nobody has to notice that the time has come.
A template marks a phase for the facilitator only where a person's judgement is the point.

**Built** ([`src/chain/gates.ts`](../src/chain/gates.ts), shown on the decision page):

| Phase | Moves on when |
| --- | --- |
| Deliberate → Decide | at least 2 points for or against, and 2 people endorsing a point |
| Decide → ready to record | every stakeholder group with power has voted, and one option has at least ⅔ of the trust-weighted combined score |

Every browser checks the gates against the same public data, so everyone sees the same phase.
Nothing is written when a gate is met: the Issue contract lets only the opener propose a result
(quantum-os#245), so the facilitator's record still closes a decision, and support that falls
below the gate first takes it back to voting. A facilitator's "Back to deliberation" records a
hold the gates respect.

**Next:** latching an advance on chain when the next member writes anything (needs the Issue
contract to accept it), and gates that use time (block height, which needs a recorded phase
start). A template states its gates as data:

```json
{"template": "decide", "version": 1, "combiner": "weighted-sum",
 "phases": [
  {"id": "deliberate", "open": ["args"],     "advance": "auto", "gate": ["points:2", "endorsers:2"]},
  {"id": "vote",       "open": ["approval"], "advance": "auto", "gate": ["heard", "support:0.67"]},
  {"id": "decided",    "open": [],           "advance": null,   "gate": []}]}
```

## Example templates

| Template | Phases | Combiner | Typical use |
| --- | --- | --- | --- |
| **Decide** | Prepare, Deliberate, Vote, Record | Weighted sum | Today's council decision |
| **Concurrence** | Propose, Review, Sign off, Record | All named signers approve | A significant decision that needs named people to agree |
| **Allocate** | Prepare, Estimate, Review, Record | Median per line, then weighted | A budget or a share split |
| **Appoint** | Nominate, Deliberate, Rank, Record | Ranked within chambers, weighted across | Choosing a steward or delegate |
| **Amend** | Prepare, Deliberate, Vote, Ratify, Record | Every chamber's majority plus a weighted supermajority | Changing a council's definition |

## Storage conventions

| What | Proposed storage |
| --- | --- |
| A process template | Issue `<councilId>.process.<slug>`, mode `process`, empty roll; its title holds the template |
| A decision's template | The facilitator's `results` entry gains `"process": "<slug>@<version>"` |
| A council definition | Issue `<councilId>.definition`, mode `definition`: URI-encoded JSON `{parent, source, def?}`; the first council created holds the whole file (built) |
| A link to what follows | Action items become `{"text", "next"}`, where `next` names the issue opened for it |

## Next steps

1. The maintainers agree the founding rule: how a council decides, and how it changes that.
2. Add power rules, process templates and rules of change to the definition format, refactoring
   `PHASES` and `DECIDE_GATES` into the Decide template.
3. Seats from anywhere: let a council seat a group from elsewhere in the tree as a chamber.
4. Latch gate advances on chain and add gates that use time.

## Sources

- [README: Multi-stakeholder councils](../README.md#multi-stakeholder-councils) and
  [Known limits](../README.md#known-limits)
- [User guide, section 9: Councils](user-guide.md#9-councils-decisions-across-stakeholder-groups)
- [CLAUDE.md](../CLAUDE.md)
- [`src/chain/council.ts`](../src/chain/council.ts), [`src/chain/gates.ts`](../src/chain/gates.ts),
  [`src/ui/council.tsx`](../src/ui/council.tsx)
- [`docs/audit/register-redteam.md`](audit/register-redteam.md)
- [quantum-os `RGov_Core.md`](https://github.com/rhovision-org/quantum-os/blob/main/RGov_Core.md)
  and [`Governance.md`](https://github.com/rhovision-org/quantum-os/blob/main/Governance.md)
- [rholo multi-stakeholder governance](https://github.com/rhovision-org/rholo/blob/dev/docs/src/qucalc/multi-stakeholder-governance.md)
