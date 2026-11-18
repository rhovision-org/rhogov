/** Node-only adapter for the independently built quantum-os mre-profile-a binary.
 * Never bundled into the browser; no chain writes or production vote changes.
 */
import { spawn } from "node:child_process";
import type { MreInput, MreNative, MreOutput } from "./mre-adapter";

export function nativeMreBinary(executable: string): MreNative {
  if (!executable) throw new Error("MrE executable must be explicitly configured");
  return (input: MreInput) => new Promise<MreOutput>((resolve, reject) => {
    const child = spawn(executable, [], { stdio: ["pipe", "pipe", "pipe"], shell: false });
    let out = "", err = "", settled = false;
    const fail = (reason: string) => { if (!settled) { settled = true; reject(new Error(reason)); } };
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (data: string) => { out += data; if (out.length > 4096) { child.kill(); fail("MrE output limit exceeded"); } });
    child.stderr.on("data", (data: string) => { err += data; if (err.length > 4096) { child.kill(); fail("MrE error output limit exceeded"); } });
    child.on("error", () => fail("MrE native process unavailable"));
    child.on("close", (code) => {
      if (settled) return;
      if (code !== 0) return fail(`MrE native failed: ${err.slice(0, 128)}`);
      try { settled = true; resolve(JSON.parse(out.trim()) as MreOutput); }
      catch { fail("MrE native returned malformed JSON"); }
    });
    child.stdin.on("error", () => fail("MrE native input failed"));
    child.stdin.end(JSON.stringify(input) + "\n");
  });
}
