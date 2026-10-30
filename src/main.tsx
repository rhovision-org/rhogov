import { render } from "preact";
import { useEffect } from "preact/hooks";
import { syncMyName } from "./ui/name-sync";
import { Help } from "./ui/help";
import { UpdateBanner, watchForUpdates } from "./ui/update";
import { checkInbox, startInboxWatch, titleWithCount, waitingCount } from "./ui/inbox-watch";
import "./styles.css";
import { notKept, openBackup } from "./storage";
import logo from "./assets/rhogov-logo.svg";
import { active, chainChecked, reloadFromStorage, chainReset, checkChain, currentNode, displayName, myAddr, refreshTick } from "./state";
import { AccountScreen, CommunityScreen, JoinScreen } from "./ui/settings";
import { GroupScreen, GroupsScreen } from "./ui/groups";
import { HomeScreen } from "./ui/home";
import { InboxScreen } from "./ui/inbox";
import { ReviewModal, Toasts, route, short } from "./ui/kit";
import { ChainReset, Welcome } from "./ui/setup";
import { IssueScreen } from "./ui/votes";
import { CouncilScreen, CouncilsScreen } from "./ui/council";


const NAV = [
  ["/", "⌂", "Home"],
  ["/groups", "◎", "Groups"],
  ["/councils", "⚖", "Councils"],
  ["/inbox", "✉", "Inbox"],
  ["/community", "⚑", "Community"],
  ["/account", "☺", "Account"],
] as const;

function Page() {
  const { parts, query } = route.value;
  const [head, a, b] = parts;
  if (head === "join") return <JoinScreen query={query} />;
  if (chainReset.value) return <ChainReset node={chainReset.value.node} />;
  if (head === "welcome" || !myAddr.value || !active.value) return <Welcome />;
  switch (head) {
    case undefined: return <HomeScreen />;
    case "groups": return <GroupsScreen />;
    case "g": return <GroupScreen gid={a} tab={b} />;
    case "v": return <IssueScreen gid={a} iid={b} />;
    case "councils": return <CouncilsScreen />;
    case "c": return <CouncilScreen cid={a} tab={b} sub={parts[3]} />;
    case "inbox": return <InboxScreen />;
    case "community": return <CommunityScreen />;
    case "account": return <AccountScreen />;
    default: return <div class="empty">Nothing here. <a href="#/">Home</a></div>;
  }
}

/** Neither localStorage nor its backup kept a write: say so before a reload loses it. */
function StorageBanner() {
  if (!notKept.value) return null;
  return (
    <div class="update warn" role="alert">
      <span><b>This browser isn't saving rhogov's data.</b> Its storage is full or switched off, so your key and communities will be gone when this page reloads. Save your key as a keystore file now (Account), then free some storage for this site in the browser's settings.</span>
      <a class="btn primary small" href="#/account">Save my key</a>
    </div>
  );
}

function App() {
  const ready = !!myAddr.value && !!active.value && chainChecked.value && !chainReset.value;
  // Which chain the node serves: on arrival, on switching networks, and about once
  // a minute after that, so a network reset while the page is open is noticed (#89).
  useEffect(() => { void checkChain(currentNode.value); }, [currentNode.value, Math.floor(refreshTick.value / 4)]);
  // Re-checked with every refresh, so a newcomer's name goes on the list as soon
  // as they have the REV for it, and everyone's names stay current.
  useEffect(() => { if (ready) syncMyName(); }, [ready, active.value?.group, myAddr.value, refreshTick.value]);
  useEffect(() => { if (ready) checkInbox(); }, [ready, active.value?.inbox, myAddr.value, refreshTick.value]);
  useEffect(() => { waitingCount.value = null; }, [active.value?.inbox, myAddr.value]);
  useEffect(() => { document.title = titleWithCount("rhogov"); }, [waitingCount.value]);
  const path = "/" + (route.value.parts[0] ?? "");
  const on = (p: string) => (p === "/" ? path === "/" : path.startsWith(p) || (p === "/groups" && (path === "/g" || path === "/v")) || (p === "/councils" && path === "/c"));
  return (
    <div class="app">
      <nav class="side">
        <div class="brand"><img src={logo} alt="rhogov" /></div>
        {ready && <a class="side-community" href="#/community" title={`${active.value!.name}: invite people, switch communities`}>{active.value!.name}</a>}
        {ready && <div class="nav">{NAV.map(([p, icon, label]) => <a href={`#${p}`} class={on(p) ? "on" : ""}><span aria-hidden="true">{icon}</span> {label}{p === "/inbox" && (waitingCount.value ?? 0) > 0 && <span class="count" aria-label={`${waitingCount.value} new`}>{waitingCount.value}</span>}</a>)}</div>}
        <Help />
        <div class="build muted" title="The version of rhogov this page is running">version {__BUILD__}</div>
        {ready && <div class="foot"><div>{displayName.value} · <span class="mono">{short(myAddr.value!)}</span></div></div>}
      </nav>
      <main>
        <UpdateBanner />
        <StorageBanner />
        {/* On phones the side bar is a tab bar with no room for the community, so it heads the page. */}
        {ready && <a class="community-bar" href="#/community">{active.value!.name}</a>}
        <Page />
      </main>
      <Toasts />
      <ReviewModal />
    </div>
  );
}

// What localStorage couldn't hold is in IndexedDB, which opens asynchronously:
// read it before the first draw, so a full storage doesn't look like no key.
void openBackup().then(() => {
  reloadFromStorage();
  start();
});

function start() {
  // The setup page stays in the address bar after "Join or start another
  // community", so reloading there (for a new version, say) showed setup again to
  // someone already set up, as if their key were gone. A fresh load lands on Home.
  if (route.value.parts[0] === "welcome" && myAddr.value && active.value) {
    history.replaceState(null, "", `${location.pathname}${location.search}#/`);
    route.value = { ...route.value, path: "/", parts: [] };
  }
  render(<App />, document.getElementById("app")!);
  watchForUpdates();
  startInboxWatch();
}
