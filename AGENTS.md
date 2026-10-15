# Agent instructions

## 0. Platform reference

Read `docs/spot-platform.md` before designing or implementing any feature. It describes
what Spot is and what it can do: identity, document store, realtime, files, AI, Slack,
access control, and rate budgets.

## 0.1 Working examples of AI and Slack calls

`site/test/index.html` is a smoke test page with verified, working calls to
`spot.ai.stream()` and `spot.slack.send()`, including error handling. Use it
as the reference when adding AI or Slack features. Keep it unstyled and
minimal; it is a test page, not part of the product UI.

- The page is served at `/test/`. Nothing links to it; the owner reaches it by
  typing the path manually. The forms are hidden by default and shown only
  when `spot.me().email` matches the `OWNER` constant in the page. Anyone else
  sees an owner-only notice. This is client side only, since Spot has no
  per-path access control; the server still enforces the AI and Slack
  policies regardless of what the page shows.
- AI access and Slack access are granted to site managers only unless the
  access policy opts visitors in with `"ai": "visitors"` or
  `"slack": "visitors"`. Production (`deploy/prod_access.json`) opts visitors
  in to both AI and Slack, so every mesh user can call them there. The local
  preview (`site/_access.json`) has no opt-ins.
- The chat model is set by the Spot admin. Pass `model` only if the admin
  confirmed the name is on the allowlist.
- The Slack bot must be a member of the target channel.

## 1. Local memory and temp files

- Use `./local_memory/` as the local user memory. Create the directory if it does not exist.
- Everything related to the local user environment and all temp files go into `./local_memory/`.
- Do not commit `./local_memory/`. It is listed in `.gitignore`.

## 2. Deploy

The site source lives in `site/`. There are two deploy targets.

### Local preview (default when the user asks for a deploy)

Deploy the Spot site from the current local state to:

```
https://pets-local-<user-slug>.spot.t1a.dev/
```

Steps:

1. Check `./local_memory/` first. If a Spot URL for the user was already inferred and stored there, use it and skip to step 4.
2. Get info about the current user:

   ```
   curl -fsS https://spot.t1a.dev/api/me
   ```

   Store the full `/api/me` response in `./local_memory/`.
3. Build `<user-slug>` from the user `name`: remove all whitespace and lowercase it.
   Store the resulting Spot URL in `./local_memory/` and use it for all local deploys from then on.
4. Always deploy local pets with access to the user only. It must be hidden from other Spot users.
   Make sure `site/_access.json` exists with this content (create it if missing):

   ```json
   {"allow": ["<email from /api/me>"]}
   ```

   Use the `email` from the stored `/api/me` response. `site/_access.json` is gitignored;
   never commit it and never remove it from `.gitignore`.
5. Deploy:

   ```
   SPOT_URL=https://spot.t1a.dev spot deploy pets-local-<user-slug> site
   ```

### Production

Production is `https://pets.spot.t1a.dev/`. Deploy it only when the user explicitly asks
for a production deploy, from a clean checkout of `main`:

```
./scripts/deploy-prod.sh
```

It deploys `site/` under the current user's mesh identity, with the policy from
`deploy/prod_access.json`: `maintainers`, `"ai": "visitors"`, `"slack": "visitors"`, and
no `allow` list, so the site and its AI and Slack calls are open to the whole mesh. Only the site owner and the listed maintainers can run it. There is no CI
deploy; the Spot apex is reachable only from inside the mesh.

## 3. Git

### Commits

- Never add `Co-Authored-By` trailers or any other co-author attribution to commits.
  Commits are authored by the current git user only.
- Commit only when the user asks.

### Branch policy: main only

- There is a single branch, `main`. Do not create feature branches, do not open pull or
  merge requests. Commit directly on `main` and push to `origin main`.
- Always assume a teammate may have pushed to `main` and that the local `main` is stale.
  Never push without integrating remote changes first.

### Push flow

Run this sequence every time you push:

```
git fetch origin
git pull --rebase origin main
git push origin main
```

`git pull --rebase` replays the local commits on top of the remote `main`, so history stays
linear and no merge commits are created. If there are no conflicts, the push just works.

If the push is rejected because someone pushed in between, repeat the sequence from
`git pull --rebase`.

### Conflicts

Resolve all conflicts yourself, completely, without asking the user and without leaving the
repository mid-rebase. Keep the teammate's changes intact and re-apply ours on top; never
discard remote work to make a conflict go away. Do not use `git rebase --skip`. After the
push, tell the user which files conflicted and how you resolved them.

### Force push

Force pushing should never be needed in this flow. If it is unavoidable (for example after
amending a commit that was already pushed), never use plain `--force`. Use the lease options
so the push fails when the remote `main` differs from what the local checkout last saw:

```
git fetch origin
git push --force-with-lease=main:origin/main --force-if-includes origin main
```

`--force-with-lease` rejects the push if remote `main` moved past the local `origin/main`.
`--force-if-includes` additionally rejects it if the remote commits were fetched but not yet
integrated into the local branch. If the push is rejected, do not retry with `--force`:
run `git pull --rebase origin main`, resolve conflicts, and push normally.
