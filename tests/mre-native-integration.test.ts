import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { previewMre } from "../src/chain/mre-adapter";
import { nativeMreBinary } from "../src/chain/mre-native-node";

async function main() {
  const executable = process.env.MRE_NATIVE_BIN;
  const fixtures = process.env.MRE_QLF_VECTORS;
  if (!executable || !fixtures) throw new Error("Set MRE_NATIVE_BIN and MRE_QLF_VECTORS; no simulated binding is allowed");
  const vectors = JSON.parse(readFileSync(fixtures, "utf8")).vectors as Array<Record<string,string>>;
  assert.equal(vectors.length, 12);
  const native = nativeMreBinary(executable);
  for (const v of vectors) {
    const result = await previewMre({ prior: v.prior, likelihoodGivenH: v.p_E_given_H, likelihoodGivenNotH: v.p_E_given_notH }, native);
    assert.equal(result.output.evidence, v.evidence, v.name + ": evidence");
    assert.equal(result.output.posteriorGivenE, v.posterior_given_E, v.name + ": E");
    assert.equal(result.output.posteriorGivenNotE, v.posterior_given_notE, v.name + ": not E");
    assert.equal(result.appliedToTally, false);
  }
  await assert.rejects(() => previewMre({ prior: "0", likelihoodGivenH: "1", likelihoodGivenNotH: "1" }, native), /native failed/);
  console.log("12/12 QLF vectors through actual Rust binary and RhoGov adapter: PASS");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
