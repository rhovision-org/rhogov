# Redirect for the old `rchain-community.github.io` origin

The GitHub org was renamed `rchain-community` → `rhovision-org`. GitHub
redirects repositories after a rename, but **not GitHub Pages**, so every link
shared before the rename — rhogov invites
(`https://rchain-community.github.io/rhogov/#/join?c=…`) and quantum-os rooms
(`https://rchain-community.github.io/quantum-os/#room=…`) — now fails.

These two files fix that once somebody holds the old name:

1. Create a GitHub organization named **`rchain-community`** (holding the name
   also stops anyone else from serving pages, and reading stored keys, at the
   old origin).
2. In it, create **one** repository named **`rchain-community.github.io`** and
   put `index.html` and `404.html` from this folder at its root. Turn on Pages
   for the default branch.
3. Do **not** create `rhogov` or `quantum-os` repositories there. With no
   project repos, every `/rhogov/…` and `/quantum-os/…` path falls through to
   the org site's `404.html`, which forwards it — path, query and hash — to the
   same place on `https://rhovision-org.github.io`. Creating a same-named repo
   would also end GitHub's git redirect for that repository.

The redirect happens in the browser, so the hash (an invite, or a room
capability) is never sent to any server.

**What it cannot carry over:** a signing key saved in the browser at the old
origin. Browser storage is per origin, so people re-import their key from the
keystore file they saved (Account → Save keystore file) under **I have a key**.
