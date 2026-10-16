# Pets

Shared virtual pets for the whole company, living in Slack. Made at a T1A hackathon.

Live site: https://pets.spot.t1a.dev/ (inside the T1A mesh only).

## What it is

Anyone in the company can create a pet. Every pet shows in one gallery, and by default anyone can care for it.
A carer opens the pet's room and types what they do or say to it. The pet answers in character.
The pet keeps a one-line memory of each visit and posts its reaction to its Slack channel.
Food, mood, energy, and health fade while nobody visits. Once a day a digest lists the pets that need attention.

Why: colleagues on different projects rarely talk. A pet gives them a small, safe reason to.

## How it works

- Runs on [Spot](docs/spot-platform.md), the internal hosting platform. Spot gives identity, a document store, realtime, file uploads, an AI gateway, and Slack.
- There is no server. All logic runs in the browser of whoever has a page open.
- Each reaction is one AI call. The model gets hashed aliases instead of names and emails.
- Only the pet owner can edit, change the care list, or dismiss a pet. Everything else is open to anyone in the mesh, and "who can care" is a UI rule, not a server rule.

Details: [docs/pets-design.md](docs/pets-design.md).

## Pages

| Path | What |
|---|---|
| `/` | Gallery of all pets |
| `/create/` | Create a pet |
| `/pet/?id=…` | Pet room |
| `/deaths/` | Pets that died in Hard Core mode |
| `/about/` | Story, how it works, roadmap, credits |
| `/story/` | One-minute animated intro |
| `/admin/`, `/test/` | Site owner tools |

## Repo layout

| Path | What |
|---|---|
| `site/` | The whole site: static HTML, CSS, and JS |
| `docs/` | Platform reference and game design |
| `deploy/` | Production access policy |
| `scripts/` | Production deploy and headless UI check |
| `AGENTS.md` | Instructions for coding agents |

## Run it

The site needs the Spot backend, so there is no local server. You need the `spot` CLI and access to the T1A mesh.
Deploy a private preview instead. First put your email in `site/_access.json` so only you see it:

```
echo '{"allow": ["you@t1a.com"]}' > site/_access.json
SPOT_URL=https://spot.t1a.dev spot deploy pets-local-<your-name> site
```

Production is deployed from a clean `main` by a maintainer with `./scripts/deploy-prod.sh`.

## Contribute

Issues and pull requests are welcome. The pets live in the `#pets` Slack channel at T1A.

## Credits

Idea: Radmila Minacheva.

Built by Radmila Minacheva, Alexandra Tsyliya, and Dmitry Mogilev.
