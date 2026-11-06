// Offline council-boundary regressions. No node, credentials, or network fixtures.
import assert from "node:assert/strict";
import { test } from "node:test";

import { approvalShare, approvals, chamberBallots, combine } from "../src/chain/council";
import { toGroup, type Outcome } from "../src/chain/gov";

const options = ["yes", "no"];
const ballots = {
  alice: ["yes", "yes", "toString", "constructor", "__proto__"],
  bob: ["no"],
  outsider: ["no", "valueOf"],
};

const chamber = toGroup("council-lab.validators", {
  name: "Validators",
  policy: "invite",
  admins: { alice: true },
  members: {
    alice: { role: "admin", label: "Alice" },
    bob: { role: "member", label: "Bob" },
  },
});

test("chamber ballot projection contains members only", () => {
  assert.ok(chamber);
  assert.deepEqual(chamberBallots(chamber, ballots), {
    alice: ballots.alice,
    bob: ballots.bob,
  });
  assert.deepEqual(chamberBallots(chamber, { outsider: ["yes"] }), {});
});

test("unlisted inherited property names never become approval options", () => {
  const counted = approvals(options, {
    alice: ballots.alice,
    bob: ballots.bob,
  });
  assert.deepEqual(counted, { yes: 1, no: 1 });
  assert.deepEqual(Object.keys(counted).sort(), options.slice().sort());
});

test("approval share ignores unlisted inherited names and duplicate approvals", () => {
  assert.ok(chamber);
  const projected = chamberBallots(chamber, ballots);
  const outcome: Outcome = {
    weights: { alice: 3, bob: 1 },
    ballots: projected,
    levels: {},
    discredited: [],
    trustActive: false,
    winner: null,
    mode: "approval",
  };
  const share = approvalShare(options, outcome);
  assert.deepEqual(share, { yes: 0.75, no: 0.25 });
  assert.deepEqual(Object.keys(share).sort(), options.slice().sort());
});

test("empty and unweighted chambers do not invent support", () => {
  assert.deepEqual(approvalShare(options, null), { yes: 0, no: 0 });
  assert.deepEqual(approvalShare(options, {
    weights: { alice: 0 },
    ballots: { alice: ["yes"] },
    levels: {},
    discredited: [],
    trustActive: false,
    winner: null,
    mode: "approval",
  }), { yes: 0, no: 0 });
});

test("exact cross-chamber ties have no winner", () => {
  const results = [
    { chamber: { id: "A" }, share: { yes: 1, no: 0 } },
    { chamber: { id: "B" }, share: { yes: 0, no: 1 } },
  ] as any;
  const power = { share: { A: 0.5, B: 0.5 }, median: {}, estimators: 0, coveredBy: {} };
  for (const order of [results, [...results].reverse()]) {
    const tally = combine(options, order, power);
    assert.equal(tally.winner, null);
    assert.deepEqual(tally.tie.slice().sort(), options.slice().sort());
  }
});
