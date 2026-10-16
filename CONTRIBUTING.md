# Contributing

Issues and pull requests are welcome.

## Flow

1. Fork the repo, or branch from `main` if you are a collaborator.
2. Make the change on a branch with a short lowercase name, for example `fix-about-tagline`.
3. Test it. Deploy a private preview and run the UI check, as described in the [README](README.md#run-it).
4. Open a pull request against `main`. Say what changed and why, in a few short sentences.
5. A collaborator reviews it and merges it with a rebase. History stays linear.

`main` is protected. Nobody pushes to it directly.

## Rules

- Keep the site static. All logic runs in the browser; there is no server.
- Read [docs/pets-design.md](docs/pets-design.md) before changing game logic.
- Write commits and pull requests in short, simple English.
- No co-author trailers on commits.
- The `/test/` page is a smoke test for platform calls. Keep it minimal and unstyled.

## Where to ask

The `#pets` Slack channel at T1A, or a GitHub issue.
