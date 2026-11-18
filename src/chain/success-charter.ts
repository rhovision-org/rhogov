// #291 — map QuantumOS success-charter/1 into RhoGov Issue/4 without a new
// consensus contract. Exact artifact in immutable title; id = SHA-256 content.
// No "closed => approved" shortcut: Issue/4's result is an opener's claim.
import { sha256 } from "@noble/hashes/sha2.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { blake2b } from "@noble/hashes/blake2.js";
import { secp256k1 } from "@noble/curves/secp256k1.js";

// A wallet signature does not prove ownership of the hash/TOFU dyncap seed.
export const CHARTER_AUTHORIZATION_TRUST = {
  walletSignature: "secp256k1-wallet-verified",
  dyncapAttribution: "hash-only-tofu-unverified",
  pollRatification: "not-independently-verified",
} as const;
export const CHARTER_TITLE_PREFIX = "qos/success-charter/1:";
export const CHARTER_PROPOSAL_PREFIX = "success-charter-";
const hex64 = /^[a-f0-9]{64}$/;
const hexPub = /^(02|03)[a-f0-9]{64}$/;
const hexSig = /^[a-f0-9]{128}$/;
const hex = (b: Uint8Array) => [...b].map((n) => n.toString(16).padStart(2,"0")).join("");
const unhex = (s: string) => new Uint8Array((s.match(/../g) || []).map((a) => parseInt(a,16)));
const encoder = new TextEncoder();

function canonical(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  return "{" + Object.keys(v as object).sort().map((k) =>
    JSON.stringify(k) + ":" + canonical((v as Record<string, unknown>)[k])).join(",") + "}";
}
export function proposalId(hash: string): string {
  if (!hex64.test(hash)) throw new Error("invalid charter hash");
  return CHARTER_PROPOSAL_PREFIX + hash;
}
export interface ExportedCharter {
  schema: "success-charter/1";
  version: 1;
  group: {id: string; name: string; uri?: string};
  charterHash: string;
  signatures: string[];
  proposer: string;
  members: {anchor:string; role:"admin"|"member"; signature?:string}[];
  [key:string]: unknown;
}
export function encodeCharterTitle(charter: ExportedCharter): string {
  const title=CHARTER_TITLE_PREFIX+encodeURIComponent(canonical(charter));
  if (encoder.encode(title).length>12000) throw new Error("charter exceeds Issue/4 transport bound");
  // Parse and rehash in exactly the same way an independent reader will.
  parseCharterTitle(title);
  return title;
}
export function parseCharterTitle(title: string): ExportedCharter {
  if (typeof title !== "string" || !title.startsWith(CHARTER_TITLE_PREFIX) || title.length > 12000)
    throw new Error("not a success-charter/1 title");
  let charter: ExportedCharter;
  try { charter = JSON.parse(decodeURIComponent(title.slice(CHARTER_TITLE_PREFIX.length))); }
  catch { throw new Error("invalid charter title encoding"); }
  if (charter?.schema !== "success-charter/1" || charter?.version !== 1
      || !hex64.test(charter?.charterHash || "") || !Array.isArray(charter?.signatures)
      || !Array.isArray(charter?.members) || !charter.group?.id) throw new Error("bad charter schema");
  if (/cap:room:/i.test(canonical(charter)) || /room[_-]?cap/i.test(canonical(charter)))
    throw new Error("raw room capability forbidden");
  if (CHARTER_TITLE_PREFIX + encodeURIComponent(canonical(charter)) !== title)
    throw new Error("noncanonical charter title");
  const { charterHash, signatures, ...content } = charter;
  const digest = hex(sha256(encoder.encode(canonical(content))));
  if (digest !== charterHash) throw new Error("CHAIN_CONTENT_HASH_MISMATCH");
  return charter;
}
function walletAddress(pub: string): string {
  const point = secp256k1.Point.fromHex(pub).toBytes(false);
  const payload = new Uint8Array([0,0,0,0,...keccak_256(keccak_256(point.slice(1)).slice(-20))]);
  const check = blake2b(payload,{dkLen:32}).slice(0,4);
  let n=0n;
  for (const b of [...payload,...check]) n=(n<<8n)|BigInt(b);
  const alpha="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let out="";
  while (n>0n) { out=alpha[Number(n%58n)]+out; n/=58n; }
  for (const b of [...payload,...check]) {if (b!==0) break;out="1"+out;}
  return out;
}
export function verifyCharterSignatures(charter: ExportedCharter,
                                        chainMembers: {addr:string;role:string}[]): void {
  const seen = new Set<string>();
  let admin=false;
  const anchors=new Map(charter.members.map((m)=>[m.anchor,m.role]));
  const memberAddresses=new Map(chainMembers.map((m)=>[m.addr,m.role]));
  if (!charter.signatures.length) throw new Error("no signatures");
  for (const s of charter.signatures) {
    const [tag,anchor,pub,sig,extra] = s.split(":");
    if (tag!=="sc1" || extra!==undefined || !hex64.test(anchor||"")
        || !hexPub.test(pub||"") || !hexSig.test(sig||"")) throw new Error("malformed charter signature");
    if (seen.has(anchor)) throw new Error("duplicate signer");
    seen.add(anchor);
    const role=anchors.get(anchor);
    const address=walletAddress(pub);
    if (!role || !memberAddresses.has(address)) throw new Error("signer not in both charter and chain group");
    const digest=sha256(encoder.encode("qos:success-charter/1:handoff\n"+charter.charterHash+"\n"+anchor));
    if (!secp256k1.verify(unhex(sig),digest,unhex(pub),{prehash:false,format:"compact"}))
      throw new Error("bad charter wallet signature");
    if (role==="admin" && memberAddresses.get(address)==="admin") admin=true;
  }
  if (!admin) throw new Error("no authenticated admin in on-chain group");
}
/** Independent ballot audit, NOT a council-policy ratification verdict.
 * A result claimed by the issue opener is never counted as evidence.
 */
export interface CharterBallotAudit {
  ok: boolean;
  yes: number;
  no: number;
  eligible: number;
  cast: number;
  abstained: number;
  reasons: string[];
}
export function auditCharterBallots(issue: {
  status:string; mode:string; options:string[]; voters:string[];
  guests:string[]; ballots:Record<string,string[]>;
  rollLog?: {seq:number;voters:number;ballotsBefore:number}[];
}, groupMembers: string[]): CharterBallotAudit {
  const reasons:string[]=[];
  const voters=issue.voters || [];
  const members=new Set(groupMembers);
  const roll=new Set(voters);
  if (issue.status!=="closed") reasons.push("issue not closed");
  if (issue.mode!=="approval" || canonical(issue.options)!==canonical(["approve","reject"]))
    reasons.push("invalid approval options");
  if (roll.size!==voters.length || voters.some(v=>!v || !members.has(v)))
    reasons.push("voter roll has duplicates or is not a subset of the current group");
  if (new Set(groupMembers).size!==groupMembers.length)
    reasons.push("duplicate group members");
  if (roll.size!==members.size || [...members].some(v=>!roll.has(v)))
    reasons.push("frozen roll differs from current group; historical membership proof required");
  if ((issue.guests || []).length) reasons.push("guest electorate requires separate policy review");
  if ((issue.rollLog || []).some(e=>e.ballotsBefore>0))
    reasons.push("electorate changed after ballots were cast");
  let yes=0,no=0;
  for (const [v, choices] of Object.entries(issue.ballots || {})) {
    if (!roll.has(v)) reasons.push("ballot from voter outside frozen roll");
    if (!Array.isArray(choices) || choices.length!==1 ||
        (choices[0]!=="approve" && choices[0]!=="reject")) {
      reasons.push("malformed or ambiguous ballot"); continue;
    }
    if (choices[0]==="approve") yes++; else no++;
  }
  if (yes+no===0) reasons.push("no valid ballots");
  return {ok:reasons.length===0,yes,no,eligible:voters.length,
          cast:Object.keys(issue.ballots || {}).length,
          abstained:Math.max(0,voters.length-Object.keys(issue.ballots || {}).length),reasons};
}
export interface CharterPolicySimulation {
  verdict:"approve"|"reject"|"inconclusive";
  quorumMet:boolean; turnout:number; requiredTurnout:number; reasons:string[];
}
/** Hypothetical policy only: never use to promote chain-facing status. */
export function simulateCharterPolicy(
  audit:CharterBallotAudit,
  policy:{quorumNumerator:number;quorumDenominator:number;
          approvalNumerator:number;approvalDenominator:number}
):CharterPolicySimulation {
  const nums=[policy.quorumNumerator,policy.quorumDenominator,
              policy.approvalNumerator,policy.approvalDenominator];
  if (!nums.every(Number.isSafeInteger) || policy.quorumDenominator<=0 ||
      policy.approvalDenominator<=0 || policy.quorumNumerator<0 ||
      policy.quorumNumerator>policy.quorumDenominator ||
      policy.approvalNumerator<=0 ||
      policy.approvalNumerator>policy.approvalDenominator)
    throw new Error("invalid policy fraction");
  const requiredTurnout=Math.ceil(audit.eligible*policy.quorumNumerator/policy.quorumDenominator);
  const quorumMet=audit.cast>=requiredTurnout;
  const reasons=[...audit.reasons];
  if (!quorumMet) reasons.push("quorum not met");
  const total=audit.yes+audit.no;
  let verdict:CharterPolicySimulation["verdict"]="inconclusive";
  if (audit.ok && quorumMet && total>0) {
    const passed=BigInt(audit.yes)*BigInt(policy.approvalDenominator)>
                 BigInt(total)*BigInt(policy.approvalNumerator);
    verdict=passed?"approve":"reject";
  }
  return {verdict,quorumMet,turnout:audit.cast,requiredTurnout,reasons};
}
export interface CharterStatus {
  status: "pending" | "approved" | "rejected" | "unknown";
  proposalId:string;
  storedHash?:string;
  phase?:string;
  reason?:string;
}
export function readCharterIssue(issue: {id:string;gid:string;title:string;status:string;mode:string;options:string[]}|null,
                                 groupId: string, expectedHash: string): CharterStatus {
  const id=proposalId(expectedHash);
  if (!issue) return {status:"unknown", proposalId:id, reason:"not found"};
  if (issue.id!==id || issue.gid!==groupId || issue.mode!=="approval"
      || canonical(issue.options)!==canonical(["approve","reject"]))
    throw new Error("CHAIN_PROPOSAL_METADATA_MISMATCH");
  const c=parseCharterTitle(issue.title);
  if (c.group.id!==groupId || c.charterHash!==expectedHash) throw new Error("CHAIN_CONTENT_HASH_MISMATCH");
  if (issue.status==="open" || issue.status==="locked")
    return {status:"pending",proposalId:id,storedHash:c.charterHash,phase:issue.status};
  // RhoGov's on-chain Issue/4 only stores ballots and the opener's proposed
  // result. To call a charter 'approved/rejected' the *separate native tally*
  // and the council ratification must be audited. No shortcut here.
  return {status:"unknown",proposalId:id,storedHash:c.charterHash,phase:issue.status,
          reason:"closed without independently verified multi-stakeholder tally"};
}
