// #291 shared-vector conformance: identical proposal ID/title/hash mapping.
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { proposalId, parseCharterTitle, encodeCharterTitle, readCharterIssue,
         verifyCharterSignatures, type ExportedCharter } from "../src/chain/success-charter";
import { revAddressOf } from "../src/chain/keys";
const vector=JSON.parse(readFileSync(new URL("../contract/success-charter-1-vector.json",import.meta.url),"utf8"));
const key=new Uint8Array(32).fill(1);
const anchor=vector.content.proposer;
const digest=sha256(new TextEncoder().encode("qos:success-charter/1:handoff\n"+vector.charterHash+"\n"+anchor));
const signature=secp256k1.sign(digest,key,{prehash:false,format:"compact"});
const pub=secp256k1.getPublicKey(key,true);
const toHex=(b:Uint8Array)=>[...b].map((n)=>n.toString(16).padStart(2,"0")).join("");
const charter:ExportedCharter={...vector.content,charterHash:vector.charterHash,
    signatures:["sc1:"+anchor+":"+toHex(pub)+":"+toHex(signature)]};
const title=encodeCharterTitle(charter);
assert.deepEqual(parseCharterTitle(title),charter);
assert.equal(proposalId(charter.charterHash),vector.proposalId);
assert.ok(title.startsWith("qos/success-charter/1:"));
const group=[{addr:revAddressOf(toHex(key)),role:"admin"}];
assert.doesNotThrow(()=>verifyCharterSignatures(charter,group));
assert.throws(()=>verifyCharterSignatures(charter,[{...group[0],addr:"wrong"}]));
assert.throws(()=>verifyCharterSignatures({...charter,signatures:[]},group));
const item={id:vector.proposalId,gid:charter.group.id,title,status:"open",mode:"approval",options:["approve","reject"]};
assert.equal(readCharterIssue(item,charter.group.id,charter.charterHash).status,"pending");
assert.equal(readCharterIssue({...item,status:"closed"},charter.group.id,charter.charterHash).status,"unknown");
assert.throws(()=>readCharterIssue({...item,title:title.replace("g-291-fixture","g-mismatch")},charter.group.id,charter.charterHash));
assert.throws(()=>readCharterIssue({...item,gid:"another"},charter.group.id,charter.charterHash));
console.log("PASS: RhoGov success-charter Issue/4 adapter, shared vector and tamper controls");


// Regression: TOFU attribution must never be promoted to a signature.
const trustBoundary = await import("../src/chain/success-charter");
assert.equal(trustBoundary.CHARTER_AUTHORIZATION_TRUST.walletSignature, "secp256k1-wallet-verified");
assert.equal(trustBoundary.CHARTER_AUTHORIZATION_TRUST.dyncapAttribution, "hash-only-tofu-unverified");
assert.equal(trustBoundary.CHARTER_AUTHORIZATION_TRUST.pollRatification, "not-independently-verified");


// Native ballot audit must not promote an opener's result to ratification.
const {auditCharterBallots}=await import("../src/chain/success-charter");
const baseAudit:{status:string;mode:string;options:string[];voters:string[];guests:string[];ballots:Record<string,string[]>;rollLog:{seq:number;voters:number;ballotsBefore:number}[]}={status:"closed",mode:"approval",options:["approve","reject"],
 voters:["wallet-a","wallet-b"],guests:[],ballots:{"wallet-a":["approve"],"wallet-b":["reject"]},rollLog:[]};
const audited=auditCharterBallots(baseAudit,["wallet-a","wallet-b"]);
assert.deepEqual({ok:audited.ok,yes:audited.yes,no:audited.no},{ok:true,yes:1,no:1});
assert.equal(readCharterIssue({...item,status:"closed"},
 charter.group.id,charter.charterHash).status,"unknown");
for(const changed of [
 {...baseAudit,ballots:{"outsider":["approve"]}},
 {...baseAudit,ballots:{"wallet-a":["approve","reject"]}},
 {...baseAudit,voters:["wallet-a","wallet-a"]},
 {...baseAudit,guests:["guest"]},
 {...baseAudit,rollLog:[{seq:2,voters:2,ballotsBefore:1}]},
 {...baseAudit,status:"open"}
]) assert.equal(auditCharterBallots(changed,["wallet-a","wallet-b"]).ok,false);
console.log("PASS: native ballot audit rejects roll mutation, outsider, malformed, guest and premature promotion");

const {simulateCharterPolicy}=await import("../src/chain/success-charter");
const policy={quorumNumerator:2,quorumDenominator:3,approvalNumerator:1,approvalDenominator:2};
const three={...baseAudit,voters:["a","b","c"],ballots:{a:["approve"],b:["approve"]}};
const threeAudit=auditCharterBallots(three,["a","b","c"]);
assert.equal(threeAudit.abstained,1);
assert.equal(simulateCharterPolicy(threeAudit,policy).verdict,"approve");
assert.equal(simulateCharterPolicy({...threeAudit,cast:1},policy).verdict,"inconclusive");
assert.equal(simulateCharterPolicy(audited,policy).verdict,"reject");
assert.equal(simulateCharterPolicy(auditCharterBallots({...baseAudit,voters:["wallet-a"]},["wallet-a","wallet-b"]),policy).verdict,"inconclusive");
for(const bad of [{...policy,quorumDenominator:0},{...policy,approvalNumerator:3},{...policy,quorumNumerator:-1}])
  assert.throws(()=>simulateCharterPolicy(audited,bad));
console.log("PASS: explicit quorum/strict-majority simulation, abstention, invalid policy and fail-closed roll");

const {auditCharterEvidence}=await import("../src/chain/success-charter");
const hash="a".repeat(64), block="b".repeat(64), proofDigest="c".repeat(64);
const envelope={
 schema:"charter-ratification-evidence/1" as const,charterHash:hash,groupId:"council",
 issueId:proposalId(hash),
 policy:{version:"v1",digest:proofDigest,source:"approved council policy",verified:true},
 electorate:{blockHash:block,rollDigest:proofDigest,verified:true},
 tally:{blockHash:block,ballotDigest:proofDigest,weightsDigest:proofDigest,delegationDigest:proofDigest,
        nativeWinner:"approve",reproduced:true},
 finality:{blockHash:block,proofDigest:proofDigest,verified:true}
};
const expected={charterHash:hash,groupId:"council"};
assert.equal(auditCharterEvidence(envelope,expected,threeAudit).ready,true);
assert.equal(auditCharterEvidence({...envelope,policy:{...envelope.policy,verified:false}},expected,threeAudit).ready,false);
assert.equal(auditCharterEvidence({...envelope,finality:{...envelope.finality,blockHash:proofDigest}},expected,threeAudit).ready,false);
assert.equal(auditCharterEvidence({...envelope,tally:{...envelope.tally,reproduced:false}},expected,threeAudit).ready,false);
assert.equal(auditCharterEvidence(envelope,{...expected,groupId:"other"},threeAudit).ready,false);
assert.equal(auditCharterEvidence(envelope,expected,{...threeAudit,ok:false}).ready,false);
console.log("PASS: evidence gate rejects policy, tally, finality, identity and ballot mismatches");
