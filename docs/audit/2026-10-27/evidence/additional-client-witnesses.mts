// Offline diagnostic: assertions reproduce the pinned baseline, not repaired behavior.
import assert from 'node:assert/strict';
const root = new URL('../../../../', import.meta.url);
const fromRoot = (path: string) => new URL(path, root).href;
// Every transport is synthetic. Unexpected network access fails before any request.
globalThis.fetch = async () => { throw new Error('Unexpected transport in offline witness'); };
const values = new Map<string, string>(), events = new Map<string, Function>();
globalThis.localStorage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, String(v)); }, removeItem: (k: string) => { values.delete(k); }, key: (i: number) => [...values.keys()][i] ?? null, get length() { return values.size; } } as any;
globalThis.location = { hash: '#/', origin: 'https://audit.invalid', pathname: '/', protocol: 'https:' } as any;
globalThis.window = { addEventListener: (n: string, fn: Function) => events.set(n, fn), scrollTo: () => { } } as any;
globalThis.document = { visibilityState: 'visible', addEventListener: () => { } } as any;
globalThis.confirm = () => true;
const { Gov, q } = await import(fromRoot('src/chain/gov.ts'));
const { RNode, NodeError } = await import(fromRoot('src/chain/node.ts'));
const state = await import(fromRoot('src/state.ts'));
const kit = await import(fromRoot('src/ui/kit.tsx'));
const council = await import(fromRoot('src/chain/council.ts'));
const inbox = await import(fromRoot('src/ui/inbox-watch.ts'));
const out: any[] = [];
const c = { name: 'A', node: 'https://audit-a.invalid', inbox: 'rho:id:inboxa', group: 'rho:id:groupa', issue: 'rho:id:issuea' };
state.addCommunity(c);
state.setKey('1'.padStart(64, '0'), 'Audit');
// E08: the normal rating API clamps negatives; raw program construction and the contract remain a separate boundary.
let terms: string[] = [];
const g = new Gov(c, () => state.secretKey.value);
g.node.deploy = async (term: string) => { terms.push(term); return [['ok']]; };
await g.rate('invite-group', 'target', -100);
await g.cast('vote', ['X', 'X', 'unlisted-option']);
assert.match(terms[0], /"target", 0/);
assert.match(terms[1], /"X", "X", "unlisted-option"/);
const raw = g.preview('group', 'rate', [q('invite-group'), q('target'), '-100']);
assert.match(raw, /-100/);
out.push({ id: 'E08', probe: 'client-input-validation', normalRatingClampsNegative: true, rawBuilderCanExpressNegative: true, duplicateAndUnlistedBallotBuilt: true });
// E09: a forged chamber is accepted by the actual discovery function.
const group = (id: string, admins: string[]) => ({ id, name: id, admins, members: admins.map(addr => ({ addr, role: 'admin', label: addr })), invited: [], asked: [], policy: 'open', deleg: {}, topic: {}, ratings: {}, censures: {} });
const parent = group('council-real', ['facilitator']);
const foreign = group('council-real.foreign', ['outsider']);
const chambers = council.councilsOf([parent, foreign] as any)[0].chambers;
assert.equal(chambers[0].id, foreign.id);
out.push({ id: 'E09', probe: 'council-child-provenance', acceptedForeignChamber: chambers[0].id, admins: chambers[0].admins });
// E10: mathematical tie incorrectly becomes a strict winner, using actual functions.
const power = council.chamberPower(['a', 'b', 'c', 'd'], { ballots: { v: ['a=10', 'b=20', 'c=30', 'd=40'] } } as any);
const results = [{ chamber: { id: 'a' }, share: { X: 1, Y: 0 } }, { chamber: { id: 'b' }, share: { X: 1, Y: 0 } }, { chamber: { id: 'c' }, share: { X: 0, Y: 1 } }, { chamber: { id: 'd' }, share: { X: 0, Y: 0 } }] as any;
const tally = council.combine(['X', 'Y'], results, power);
assert.equal(tally.winner, 'X');
out.push({ id: 'E10', probe: 'floating-tie', mathematicalScore: { X: '3/10', Y: '3/10' }, actual: tally });
// E11: an entirely absent response is converted into an apparently ordinary outcome.
const empty = new Gov(c, () => null);
empty.node.explore = async () => [];
const outcome = await empty.outcome('group', 'vote');
assert.equal(outcome.winner, null);
assert.deepEqual(outcome.weights, {});
out.push({ id: 'E11', probe: 'empty-native-response', returned: outcome, errorRaised: false });
// E12: a failed genesis read still enables the checked flag.
const oldGenesis = RNode.prototype.genesis;
RNode.prototype.genesis = async () => { throw new NodeError('synthetic offline genesis'); };
await state.checkChain(c.node);
assert.equal(state.chainChecked.value, true);
out.push({ id: 'E12', probe: 'genesis-read-failure', chainChecked: state.chainChecked.value, knownGenesis: state.knownGenesis.value[c.node] ?? null });
RNode.prototype.genesis = oldGenesis;
// E13: an old inbox read writes count/seen into a newly selected community.
let resolveCount: any;
const before = state.gov.value!;
before.inboxCounts = () => new Promise(r => { resolveCount = r; });
const reading = inbox.checkInbox(true);
const next = { ...c, name: 'B', inbox: 'rho:id:inboxb', group: 'rho:id:groupb', issue: 'rho:id:issueb' };
state.addCommunity(next);
resolveCount({ note: 7 });
await reading;
assert.equal(inbox.waitingCount.value, 7);
const seenKey = `rhogov:inbox-seen:${next.inbox}:${state.myAddr.value}`;
assert.equal(values.get(seenKey), '7');
out.push({ id: 'E13', probe: 'late-inbox-scope', active: state.active.value?.name, count: inbox.waitingCount.value, newCommunitySeenValue: values.get(seenKey) });
// E14: actual group + issues list methods issue 121 explores for the declared fixture.
let reads = 0;
const fixture = new Gov(c, () => null), gids = Array.from({ length: 10 }, (_, i) => `g${i}`);
fixture.node.explore = async (term: string) => {
    reads++;
    if (term.includes('"groups", []'))
        return [gids];
    if (term.includes('"groupOf"'))
        return [{ name: 'fixture', members: {}, admins: {}, policy: 'open' }];
    if (term.includes('"issuesOf"')) {
        const gid = /"issuesOf", \["([^"]+)"\]/.exec(term)?.[1];
        assert.ok(gid);
        return [Array.from({ length: 10 }, (_, i) => `${gid}-i${i}`)];
    }
    if (term.includes('"issueOf"'))
        return [{ gid: 'g', title: 'fixture', by: 'a', status: 'open', mode: 'approval', options: ['X', 'Y'], voters: {}, ballots: {}, results: {} }];
    throw new Error('unexpected term');
};
const gs = await fixture.groupsRead();
await Promise.all(gs.groups.map(x => fixture.issues(x.id)));
assert.equal(reads, 121);
out.push({ id: 'E14', probe: 'list-fanout', visibleGroups: 10, issuesPerGroup: 10, exploreCalls: reads });
// E15: actual router parse throws on a malformed URI segment.
globalThis.location.hash = '#/%E0%A4%A';
let routeError = '';
try {
    events.get('hashchange')?.();
}
catch (e: any) {
    routeError = e.name;
}
assert.equal(routeError, 'URIError');
out.push({ id: 'E15', probe: 'malformed-route', error: routeError });
// E16: finite numeric strings can overflow the normalisation used for council power.
const overflow = council.chamberPower(['a', 'b'], { ballots: { v: ['a=1e308', 'b=1'] } } as any);
assert.equal(Number.isNaN(overflow.share.a), true);
out.push({ id: 'E16', probe: 'estimate-overflow', finiteInput: true, shareA: String(overflow.share.a), shareB: String(overflow.share.b) });
console.log(JSON.stringify(out, null, 2));
process.exit(0);
