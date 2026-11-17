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
