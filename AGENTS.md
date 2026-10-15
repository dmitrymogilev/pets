# Agent instructions

## 0. Platform reference

Read `docs/spot-platform.md` before designing or implementing any feature. It describes
what Spot is and what it can do: identity, document store, realtime, files, AI, Slack,
access control, and rate budgets.

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
`deploy/prod_access.json`: `maintainers` and no `allow` list, so the site is open to the
whole mesh. Only the site owner and the listed maintainers can run it. There is no CI
deploy; the Spot apex is reachable only from inside the mesh.
