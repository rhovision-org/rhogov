import { strict as assert } from "node:assert";
import { canonicalRational, previewMre } from "../src/chain/mre-adapter";

async function main() {
  for (const good of ["0", "1", "-1/2", "99/100", "100000000000000000000000001/3"]) {
    assert.equal(canonicalRational(good), true, good);
  }
  for (const bad of ["1/1", "2/4", "0/2", "1/0", "01", "+1", "1.0", "NaN", "1e-3", "1/-2"]) {
    assert.equal(canonicalRational(bad), false, bad);
  }
  const input = { prior: "1/100", likelihoodGivenH: "1", likelihoodGivenNotH: "1/9801" };
  await assert.rejects(() => previewMre(input), /binding unavailable/);
  const result = await previewMre(input, async () => ({ evidence: "1/99", posteriorGivenE: "99/100", posteriorGivenNotE: "0" }));
  assert.equal(result.appliedToTally, false);
  assert.equal(result.mode, "read-only");
  assert.equal(result.output.posteriorGivenE, "99/100");
  await assert.rejects(() => previewMre(input, async () => ({ evidence: "1/99", posteriorGivenE: "0.99", posteriorGivenNotE: "0" })), /Invalid native/);
  console.log("MrE adapter transport/fail-closed tests PASS");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
