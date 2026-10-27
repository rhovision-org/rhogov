// Offline diagnostic: assertions reproduce the pinned baseline, not repaired behavior.
import assert from 'node:assert/strict';
const root = new URL('../../../../', import.meta.url);
const fromRoot = (path: string) => new URL(path, root).href;
// Every transport is synthetic. Unexpected network access fails before any request.
globalThis.fetch = async () => { throw new Error('Unexpected transport in offline witness'); };
const store = new Map<string, string>();
globalThis.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, String(v)); }, removeItem: (k: string) => { store.delete(k); }, key: (i: number) => [...store.keys()][i] ?? null, get length() { return store.size; } } as any;
globalThis.location = { hash: '#/', origin: 'https://audit.invalid', pathname: '/', protocol: 'https:' } as any;
globalThis.window = { addEventListener: () => { }, scrollTo: () => { } } as any;
globalThis.document = { visibilityState: 'hidden', addEventListener: () => { } } as any;
globalThis.confirm = () => true;
const { RNode, NodeError } = await import(fromRoot('src/chain/node.ts'));
const { Gov } = await import(fromRoot('src/chain/gov.ts'));
const state = await import(fromRoot('src/state.ts'));
const kit = await import(fromRoot('src/ui/kit.tsx'));
const pending = await import(fromRoot('src/ui/pending-writes.ts'));
const { approvalShare, combine } = await import(fromRoot('src/chain/council.ts'));
const c = { name: 'audit', node: 'https://audit.invalid', inbox: 'rho:id:inbox', group: 'rho:id:group', issue: 'rho:id:issue' };
state.addCommunity(c);
state.setKey('1'.padStart(64, '0'), 'Audit');
const results: any[] = [];
// Use the real submit path, with a transport failure after signing. No network.
const n = new RNode(c.node);
n.status = async () => ({ shardId: '/audit', latestBlockNumber: 10 });
n.balance = async () => 1e12;
const id = pending.writeId('probe:transport');
let savedBeforeTransport = false;
globalThis.fetch = async () => {
    const receipt = pending.pendingFor(id, c.node, state.myAddr.value!);
    assert.ok(receipt && receipt !== 'unreadable' && receipt.sig);
    savedBeforeTransport = true;
    throw new TypeError('Synthetic response loss after signing');
};
await kit.act('probe transport failure', (t: any) => n.submit('new return in { return!(1) }', state.secretKey.value!, 1000000, t.signed), { risk: 'consequential', key: 'probe:transport' });
assert.equal(savedBeforeTransport, true);
const p = pending.pendingFor(id, c.node, state.myAddr.value!);
assert.equal(p, null);
results.push({ probe: 'receipt-after-network-error', savedBeforeTransport, pending: p, evidence: 'Signature was saved before fetch; NodeError cleared it in act catch.' });
// Real routine review callback: no modal, despite enabled preference.
state.setReview(true);
let permitted = false;
await kit.act('probe routine', async (t: any) => { permitted = await t.review('audit term'); return true; }, { risk: 'routine', key: 'probe:routine' });
assert.equal(permitted, true);
assert.equal(kit.ReviewModal(), null);
results.push({ probe: 'review-routine', reviewEnabled: state.reviewBeforeSign.value, permitted, modal: null });
// Non-injected function: actual council arithmetic with one failed chamber.
const options = ['X', 'Y'];
const power = { share: { A: .4, B: .6 }, median: {}, estimators: 0, coveredBy: {} };
const outcome = (voter: string, choice: string) => ({ weights: { [voter]: 1 }, ballots: { [voter]: [choice] } } as any);
const full = [{ chamber: { id: 'A' }, share: approvalShare(options, outcome('a', 'X')) }, { chamber: { id: 'B' }, share: approvalShare(options, outcome('b', 'Y')) }] as any;
const partial = [full[0], { chamber: { id: 'B' }, share: approvalShare(options, null) }] as any;
assert.equal(combine(options, full, power).winner, 'Y');
assert.equal(combine(options, partial, power).winner, 'X');
results.push({ probe: 'council-failed-read', full: combine(options, full, power), missingB: combine(options, partial, power) });
// Actual issues() silently filters individual failures.
const g = new Gov(c, () => null);
g.issueIds = async () => ['readable', 'failed'];
g.issue = async (id: string) => {
    if (id === 'failed') throw new NodeError('synthetic timeout');
    return { id } as any;
};
const issues = await g.issues('G');
assert.deepEqual(issues.map((i: any) => i.id), ['readable']);
results.push({ probe: 'issues-partial', returned: issues, returnedError: false });
// Actual archive() swallows persistence failure.
const oldSet = localStorage.setItem;
localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
let archiveThrew = false;
try {
    state.archive(state.myAddr.value!, c, [{ from: state.myAddr.value!, type: 'message', fields: { subject: 'unsaved' }, at: 1 }]);
}
catch {
    archiveThrew = true;
}
localStorage.setItem = oldSet;
assert.equal(archiveThrew, false);
assert.equal(state.archived(state.myAddr.value!, c).length, 0);
results.push({ probe: 'archive-quota', exceptionReported: archiveThrew, persistedMessages: 0 });
// Tip TTL cache has no in-flight deduplication. Fake 20 parallel reads.
let tips = 0, explores = 0;
globalThis.fetch = async (input: any) => {
    const url = String(input);
    if (url.endsWith('/api/blocks/1')) {
        tips++;
        await new Promise(r => setTimeout(r, 5));
        return new Response(JSON.stringify([{ blockHash: 'audit-block' }]));
    }
    explores++;
    return new Response(JSON.stringify({ expr: [] }));
};
const cold = new RNode('https://cold-audit.invalid');
await Promise.all(Array.from({ length: 20 }, () => cold.explore('Nil')));
assert.equal(tips, 20);
assert.equal(explores, 20);
results.push({ probe: 'cold-tip-fanout', reads: 20, tipRequests: tips, exploreRequests: explores });
// Identical group URI across different chains overwrites community identity.
state.addCommunity({ ...c, node: 'https://second-audit.invalid', name: 'second' });
results.push({ probe: 'community-scope-collision', communities: state.communities.value.filter((x: any) => x.group === c.group) });
assert.equal(state.communities.value.filter((x: any) => x.group === c.group).length, 1);
console.log(JSON.stringify(results, null, 2));
process.exit(0);
