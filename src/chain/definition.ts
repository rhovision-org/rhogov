// definition.ts — a council definition: a whole structure of councils, loaded
// from one file and created in two deploys (docs/process-orchestration.md).
//
// A definition names councils, each with its stakeholder groups (chambers),
// and how they hang together: a council may name a `parent` in the same file.
// A council marked `later` is checked and listed but not created until someone
// creates it from its parent's page, so a hierarchy can be declared whole and
// built only as far as it is needed.
//
// Stored as conventions, like everything else in a council:
//
//   the definition   Issue  <councilId>.definition   mode "definition", empty roll;
//                    its title is URI-encoded JSON {"parent", "source", "def"?}
//                    (encoded because this node's rholang parser refuses the
//                    backslash JSON puts before a quote):
//                      parent  the parent council's id, or null
//                      source  the council whose definition issue holds the file
//                      def     the whole file, on the source council only
//
// Nothing here adds a contract or moves tallying out of the natives: a council
// created from a definition is the same groups and issues the New council form
// makes, plus that one issue.

import { COUNCIL_PREFIX, chamberId, weightsIssueId } from "./council";
import { q, qList, qSet } from "./gov";

export const DEFINITION_KIND = "rhogov-council-definition";
export const definitionIssueId = (cid: string) => `${cid}.definition`;
export const councilIdOf = (slug: string) => COUNCIL_PREFIX + slug;

export interface ChamberSpec { slug: string; name: string; policy: "open" | "invite" }
export interface CouncilSpec { slug: string; name: string; purpose: string; parent?: string; later?: boolean; chambers: ChamberSpec[] }
export interface Definition { kind: typeof DEFINITION_KIND; version: 1; name?: string; councils: CouncilSpec[] }

/** What a council's `.definition` issue records about it. */
export interface Placement { parent: string | null; source: string; def?: Definition }

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

/**
 * Check a definition before anything is signed. `existing` holds the group ids
 * already in the community, so a council that would collide is reported rather
 * than written over. Every problem is listed, in words a person can act on.
 */
export function checkDefinition(raw: unknown, existing: Set<string> = new Set()): { def?: Definition; errors: string[] } {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { errors: ["The file is not a council definition: expected a JSON object."] };
  const r = raw as Record<string, unknown>;
  if (r.kind !== DEFINITION_KIND) errors.push(`"kind" must be "${DEFINITION_KIND}".`);
  if (r.version !== 1) errors.push(`"version" must be 1.`);
  if (!Array.isArray(r.councils) || r.councils.length === 0) return { errors: [...errors, `"councils" must list at least one council.`] };
  const councils: CouncilSpec[] = [];
  const slugs = new Set<string>();
  r.councils.forEach((c: any, n: number) => {
    const at = `Council ${n + 1}${c && typeof c.name === "string" && c.name.trim() ? ` (${c.name.trim()})` : ""}`;
    if (!c || typeof c !== "object") { errors.push(`${at} is not an object.`); return; }
    const slug = String(c.slug ?? "");
    if (!SLUG.test(slug)) errors.push(`${at}: "slug" must be 1–32 lowercase letters, digits or dashes, like "network".`);
    else if (slugs.has(slug)) errors.push(`${at}: the slug "${slug}" is used twice.`);
    else if (existing.has(councilIdOf(slug))) errors.push(`${at}: this community already has a council "${councilIdOf(slug)}". Change the slug to make a new one.`);
    slugs.add(slug);
    if (typeof c.name !== "string" || !c.name.trim()) errors.push(`${at}: give it a "name".`);
    if (typeof c.purpose !== "string" || !c.purpose.trim()) errors.push(`${at}: give it a "purpose", saying what it decides.`);
    if (c.parent !== undefined && typeof c.parent !== "string") errors.push(`${at}: "parent" must be the slug of another council in the file.`);
    if (c.later !== undefined && typeof c.later !== "boolean") errors.push(`${at}: "later" must be true or false.`);
    const chambers: ChamberSpec[] = [];
    if (!Array.isArray(c.chambers) || c.chambers.length < 2) errors.push(`${at}: list at least two stakeholder groups under "chambers".`);
    else {
      const cs = new Set<string>();
      c.chambers.forEach((ch: any, k: number) => {
        const cat = `${at}, stakeholder group ${k + 1}`;
        const s = String(ch?.slug ?? "");
        if (!SLUG.test(s)) errors.push(`${cat}: "slug" must be 1–32 lowercase letters, digits or dashes.`);
        else if (cs.has(s)) errors.push(`${cat}: the slug "${s}" is used twice in this council.`);
        cs.add(s);
        if (typeof ch?.name !== "string" || !ch.name.trim()) errors.push(`${cat}: give it a "name".`);
        const policy = ch?.policy ?? "open";
        if (policy !== "open" && policy !== "invite") errors.push(`${cat}: "policy" must be "open" or "invite".`);
        chambers.push({ slug: s, name: String(ch?.name ?? "").trim(), policy });
      });
    }
    councils.push({ slug, name: String(c.name ?? "").trim(), purpose: String(c.purpose ?? "").trim(), ...(c.parent ? { parent: c.parent } : {}), ...(c.later ? { later: true } : {}), chambers });
  });
  for (const c of councils) {
    if (!c.parent) continue;
    if (c.parent === c.slug) errors.push(`${c.name}: a council can't be its own parent.`);
    else if (!slugs.has(c.parent)) errors.push(`${c.name}: its parent "${c.parent}" is not a council in this file.`);
  }
  // A parent chain must end, or no council in the loop has a top to hang from.
  for (const c of councils) {
    const seen = new Set<string>();
    for (let p: CouncilSpec | undefined = c; p?.parent; p = councils.find((x) => x.slug === p!.parent)) {
      if (seen.has(p.slug)) { errors.push(`${c.name}: its parents go round in a circle.`); break; }
      seen.add(p.slug);
    }
  }
  for (const c of councils) {
    const p = councils.find((x) => x.slug === c.parent);
    if (!c.later && p?.later) errors.push(`${c.name}: it is created now, but its parent ${p.name} is created later. Mark it "later" too.`);
  }
  if (!councils.some((c) => !c.later)) errors.push(`Every council is marked "later", so loading it would create nothing.`);
  if (errors.length) return { errors };
  return { def: { kind: DEFINITION_KIND, version: 1, ...(typeof r.name === "string" && r.name.trim() ? { name: r.name.trim() } : {}), councils }, errors };
}

/** The council a definition is stored on: the first one created now. */
export const sourceOf = (def: Definition) => councilIdOf(def.councils.find((c) => !c.later)!.slug);

/** One group deploy: each council in `which` and its stakeholder groups. */
export function groupCalls(which: CouncilSpec[]): [string, string[]][] {
  return which.flatMap((c) => {
    const cid = councilIdOf(c.slug);
    return [
      ["create", [q(cid), q(c.name), q("open")]],
      ...c.chambers.map((ch) => ["create", [q(chamberId(cid, ch.slug)), q(ch.name), q(ch.policy)]] as [string, string[]]),
    ] as [string, string[]][];
  });
}

/**
 * One issue deploy: for each council in `which`, its voting-power estimate
 * (whose title is the council's purpose, as the New council form does) and its
 * `.definition` issue. The source council's carries the whole file.
 */
export function issueCalls(def: Definition, which: CouncilSpec[], me: string): [string, string[]][] {
  const source = sourceOf(def);
  return which.flatMap((c) => {
    const cid = councilIdOf(c.slug);
    const placement: Placement = { parent: c.parent ? councilIdOf(c.parent) : null, source, ...(cid === source ? { def } : {}) };
    return [
      ["open", [q(weightsIssueId(cid)), q(cid), q(c.purpose), q("estimate"), qList(c.chambers.map((ch) => chamberId(cid, ch.slug))), qSet([me])]],
      ["open", [q(definitionIssueId(cid)), q(cid), q(encodeURIComponent(JSON.stringify(placement))), q("definition"), "[]", qSet([])]],
    ] as [string, string[]][];
  });
}

/** A `.definition` issue's title, read back; null if it isn't one. */
export function readPlacement(title: string | undefined): Placement | null {
  if (!title) return null;
  try {
    const p = JSON.parse(title.startsWith("%7B") ? decodeURIComponent(title) : title);
    if (!p || typeof p !== "object" || typeof p.source !== "string") return null;
    const def = p.def ? checkDefinition(p.def).def : undefined;
    return { parent: typeof p.parent === "string" ? p.parent : null, source: p.source, ...(def ? { def } : {}) };
  } catch { return null; }
}

/** The councils a definition still has to create under `cid`, given which councils exist. */
export function laterUnder(def: Definition, cid: string, existing: Set<string>): CouncilSpec[] {
  return def.councils.filter((c) => c.later && c.parent && councilIdOf(c.parent) === cid && !existing.has(councilIdOf(c.slug)));
}

/** What a running council looks like, for export. */
export interface Built { cid: string; name: string; purpose: string; parent: string | null; chambers: { id: string; name: string; policy: "open" | "invite" }[] }

/**
 * Export a council and everything under it as a definition another community
 * can load: the councils that exist as they are now, and the ones the source
 * definition still marks `later` beneath them.
 */
export function exportDefinition(root: string, built: Built[], source?: Definition, name?: string): Definition {
  const under = new Set([root]);
  for (let grew = true; grew;) {
    grew = false;
    for (const b of built) if (b.parent && under.has(b.parent) && !under.has(b.cid)) { under.add(b.cid); grew = true; }
  }
  const slug = (cid: string) => cid.slice(COUNCIL_PREFIX.length);
  const councils: CouncilSpec[] = built.filter((b) => under.has(b.cid)).map((b) => ({
    slug: slug(b.cid), name: b.name, purpose: b.purpose,
    ...(b.parent && under.has(b.parent) && b.cid !== root ? { parent: slug(b.parent) } : {}),
    chambers: b.chambers.map((ch) => ({ slug: ch.id.slice(b.cid.length + 1), name: ch.name, policy: ch.policy })),
  }));
  const have = new Set(councils.map((c) => c.slug));
  for (let grew = true; grew && source;) {
    grew = false;
    for (const c of source.councils) if (c.later && c.parent && have.has(c.parent) && !have.has(c.slug)) { councils.push({ ...c }); have.add(c.slug); grew = true; }
  }
  return { kind: DEFINITION_KIND, version: 1, ...(name ? { name } : {}), councils };
}

const sh = (slug: string, name: string, policy: "open" | "invite" = "open"): ChamberSpec => ({ slug, name, policy });
const STAKE = {
  users: sh("users", "Users"), developers: sh("developers", "Developers"), validators: sh("validators", "Validators", "invite"),
  holders: sh("holders", "Token holders"), providers: sh("providers", "Service providers"), stewards: sh("stewards", "Governance stewards", "invite"),
  regulators: sh("regulators", "Regulators (advisory)", "invite"),
};

/**
 * A starting point for rholo governance: a network council where every
 * stakeholder group has a voice, and issue councils under it that are created
 * the first time a question of their kind comes up. Edit it before loading.
 */
export const RHOLO_TEMPLATE: Definition = {
  kind: DEFINITION_KIND, version: 1, name: "rholo governance",
  councils: [
    { slug: "rholo-network", name: "rholo Network Council", purpose: "Decide questions that affect more than one stakeholder group in rholo, and refer the rest to the council whose scope covers them.",
      chambers: [STAKE.validators, STAKE.developers, STAKE.users, STAKE.holders, STAKE.providers, STAKE.stewards, STAKE.regulators] },
    { slug: "rholo-upgrades", name: "Node upgrades", parent: "rholo-network", later: true, purpose: "Coordinate when and how node upgrades roll out.",
      chambers: [STAKE.validators, STAKE.developers, STAKE.users] },
    { slug: "rholo-protocol", name: "Protocol proposals", parent: "rholo-network", later: true, purpose: "Decide which protocol changes go into rholo.",
      chambers: [STAKE.developers, STAKE.validators, STAKE.users] },
    { slug: "rholo-treasury", name: "Treasury", parent: "rholo-network", later: true, purpose: "Decide budgets, grants and bounties.",
      chambers: [STAKE.holders, STAKE.stewards, STAKE.developers] },
    { slug: "rholo-fees", name: "Fees", parent: "rholo-network", later: true, purpose: "Decide fee levels and how disputes over them are settled.",
      chambers: [STAKE.users, STAKE.validators, STAKE.providers] },
    { slug: "rholo-standards", name: "Integration standards", parent: "rholo-network", later: true, purpose: "Agree standards for wallets, exchanges and the name and token directories.",
      chambers: [STAKE.providers, STAKE.developers, STAKE.users] },
    { slug: "rholo-charter", name: "Charter and appointments", parent: "rholo-network", later: true, purpose: "Appoint facilitators and delegates, hear censure appeals, and change this definition.",
      chambers: [STAKE.stewards, STAKE.validators, STAKE.developers, STAKE.users, STAKE.holders] },
  ],
};
