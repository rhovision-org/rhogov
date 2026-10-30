// gates.ts — when a council decision moves to its next phase by itself.
//
// A phase used to move only when the facilitator pressed a button. A gate is a
// condition on public data that every client evaluates the same way: the points
// on the deliberation board, who endorsed them, which chambers have voted, and
// the trust-weighted approval the node's natives produce (rho:gov:* through
// Gov.chamberOutcome, combined by `combine`). When a phase's gates all hold,
// every client shows the decision in the next phase. Nothing is written: the
// Issue contract lets only the opener propose a result (quantum-os#245), so
// the facilitator's record is still what closes a decision. What the gate
// removes is the waiting: nobody has to notice that the time has come.
//
// The advance is derived, not latched, so it can go back: support that falls
// below the gate before the record is made takes the decision back to voting.
// The screen says so.

import { type ChamberResult, type PhaseId, type Power, combine, decodeArg } from "./council";
import type { Issue } from "./gov";

export type Gate =
  /** At least `min` points for or against on the deliberation board. */
  | { kind: "points"; min: number }
  /** At least `min` different people have endorsed a point. */
  | { kind: "endorsers"; min: number }
  /** Every stakeholder group with voting power has at least one ballot. */
  | { kind: "heard" }
  /** One option leads, with at least `min` (0..1) of the trust-weighted combined score. */
  | { kind: "support"; min: number };

/** The gates that end each phase of the Decide process. A phase with none never advances by itself. */
export const DECIDE_GATES: Partial<Record<PhaseId, Gate[]>> = {
  deliberate: [{ kind: "points", min: 2 }, { kind: "endorsers", min: 2 }],
  vote: [{ kind: "heard" }, { kind: "support", min: 2 / 3 }],
};

export interface GateInput {
  decision: Issue;
  args: Issue | null;
  results: ChamberResult[];
  power: Power;
}

export interface GateCheck { gate: Gate; met: boolean; says: string }

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function checkGate(gate: Gate, x: GateInput): GateCheck {
  switch (gate.kind) {
    case "points": {
      const n = (x.args?.options ?? []).map(decodeArg).filter(Boolean).length;
      return { gate, met: n >= gate.min, says: `${n} of ${gate.min} points for or against` };
    }
    case "endorsers": {
      const n = Object.values(x.args?.ballots ?? {}).filter((b) => b.length > 0).length;
      return { gate, met: n >= gate.min, says: `${n} of ${gate.min} people endorsing a point` };
    }
    case "heard": {
      const counted = x.results.filter((r) => (x.power.share[r.chamber.id] ?? 0) > 0);
      const silent = counted.filter((r) => r.ballots === 0).map((r) => r.chamber.name);
      return { gate, met: counted.length > 0 && silent.length === 0, says: silent.length ? `not yet voted: ${silent.join(", ")}` : "every stakeholder group has voted" };
    }
    case "support": {
      const t = combine(x.decision.options, x.results, x.power);
      const top = t.winner ? t.score[t.winner] : 0;
      return { gate, met: !!t.winner && top >= gate.min, says: t.winner ? `${t.winner} has ${pct(top)} of ${pct(gate.min)} trust-weighted support` : `no option leads yet (needs ${pct(gate.min)})` };
    }
  }
}

export interface Phase {
  /** The phase every client shows. */
  phase: PhaseId;
  /** The phase the facilitator last recorded. */
  recorded: PhaseId;
  /** True when `phase` is ahead of `recorded` because gates held. */
  auto: boolean;
  /** The gates of the phase shown, as they stand: what it is waiting for. Empty when it never advances by itself. */
  waiting: GateCheck[];
}

/**
 * The phase a decision is in. Start from the facilitator's record and step
 * forward while the current phase's gates all hold. "decided" reached this way
 * is the gate's verdict; the record that closes the issues is still the
 * facilitator's. A recorded `hold` (the facilitator took it back to
 * deliberation) stops the stepping, or the gate would undo that at once.
 */
export function phaseOf(recorded: PhaseId, hold: boolean, x: GateInput, gates = DECIDE_GATES): Phase {
  let phase = recorded;
  if (!hold && x.decision.status === "open") {
    for (;;) {
      const gs = gates[phase];
      if (!gs?.length || !gs.every((g) => checkGate(g, x).met)) break;
      const next: PhaseId | null = phase === "prepare" ? "deliberate" : phase === "deliberate" ? "vote" : phase === "vote" ? "decided" : null;
      if (!next) break;
      phase = next;
    }
  }
  return { phase, recorded, auto: phase !== recorded, waiting: (gates[phase] ?? []).map((g) => checkGate(g, x)) };
}
