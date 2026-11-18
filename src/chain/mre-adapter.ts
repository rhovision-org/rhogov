/**
 * Read-only, fail-closed transport adapter for QLF Profile A / mre-core.
 * It does NOT calculate a second posterior or change rhogov voting weights.
 * A verified native/WASM binding must be injected by the caller.
 */
export const MRE_PROFILE = "qlf-mre-binary-profile-a/1" as const;
export const MRE_CRATE_SOURCE = "rhovision-org/quantum-os#318" as const;
export const MRE_VECTOR_SHA256 = "99b85c395e792eed8b30708d493c03f87d778965634b6db449a04d77759d832f" as const;

export type MreInput = Readonly<{ prior: string; likelihoodGivenH: string; likelihoodGivenNotH: string }>;
export type MreOutput = Readonly<{ evidence: string; posteriorGivenE: string; posteriorGivenNotE: string | null }>;
export type MreNative = (input: MreInput) => Promise<MreOutput>;
export type MrePreview = Readonly<{
  profile: typeof MRE_PROFILE;
  vectorSha256: typeof MRE_VECTOR_SHA256;
  mode: "read-only";
  appliedToTally: false;
  input: MreInput;
  output: MreOutput;
}>;

/** Canonical rational serialization: reduced n/d or integer; never JS number. */
export function canonicalRational(text: string): boolean {
  if (!/^(?:0|-?[1-9][0-9]*)(?:\/[1-9][0-9]*)?$/.test(text)) return false;
  const [n, d = "1"] = text.split("/");
  const numerator = BigInt(n), denominator = BigInt(d);
  if (denominator === 1n) return !text.includes("/");
  if (numerator === 0n || denominator <= 1n) return false;
  let a = numerator < 0n ? -numerator : numerator, b = denominator;
  while (b !== 0n) [a, b] = [b, a % b];
  return a === 1n;
}

/** Preview only. Native results are NOT independently authenticated by this transport check. */
export async function previewMre(input: MreInput, native?: MreNative): Promise<MrePreview> {
  if (!native) throw new Error("MrE native binding unavailable; calibrated trust disabled");
  if (![input.prior, input.likelihoodGivenH, input.likelihoodGivenNotH].every(canonicalRational)) {
    throw new Error("MrE requires canonical rational strings");
  }
  const output = await native(input);
  if (!output || !canonicalRational(output.evidence) ||
      !canonicalRational(output.posteriorGivenE) ||
      (output.posteriorGivenNotE !== null && !canonicalRational(output.posteriorGivenNotE))) {
    throw new Error("Invalid native MrE response");
  }
  return { profile: MRE_PROFILE, vectorSha256: MRE_VECTOR_SHA256,
    mode: "read-only", appliedToTally: false, input, output };
}
