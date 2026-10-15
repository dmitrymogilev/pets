# Spot platform reference

What Spot is and what it can do. Read this before designing or implementing any
feature in Pets.

## Core model

- A Spot site is a static folder with an `index.html`, deployed with
  `spot deploy <name> <folder>`.
- All dynamic behavior comes from the browser SDK: `<script src="/spot.js"></script>`.
- The SDK talks same-origin to Spot's built-in backend. No API keys, no auth code.
- TypeScript types are served at `/spot.d.ts`.
- The frontend is anything that builds to static files: plain HTML/CSS/JS, or React,
  Vue, Svelte, and similar via their build output.
- All game logic runs in the browser. Documents hold durable state, rooms carry
  transient events, and client code reconciles them.

## Identity

- `spot.me()` returns `email`, `name`, `groups`, peer info from the mesh, and
  `slack_allowed`.
- Every document records its owner, so per-user data needs no extra setup.

## JSON document store

- Schemaless collections, private to the site, shared across all visitors of the site.
- Each document is up to 1 MB and records an owner.
- Pull: `list`, `get`, `getMany`, `count`, `iterate`.
- Query: `where` with `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in` on top-level fields,
  plus `sort`, `order`, `limit`, and cursor paging.
- Atomic `increment`.
- Per-user scoping: read with `{ mine: true }`; write with `updateMine`, `deleteMine`,
  `incrementMine`.
- Collections named `shared-*` are global across all Spot sites, for cross-site
  leaderboards and libraries.

## Realtime

- Collection subscriptions push every create, update, and delete live, with optional
  replay of current documents on subscribe.
- Ephemeral rooms give pub/sub messaging, presence, and connection status. Messages
  are delivered live and not stored. Use rooms for lobbies, cursors, and turn-based
  or casual realtime play.
- Rooms named `shared-*` are global across all Spot sites.

## File store

- Uploads up to 25 MB each, immutable per upload, with list and delete.
- File URLs are private to the mesh.

## AI gateway

- Server-held, OpenAI-compatible: chat, streaming, and image generation.
- Site managers by default. Visitors get access via an opt-in in `_access.json`.

## Slack bridge

One-way outbound. The SDK exposes one method: `spot.slack.send()`.

- Post to a channel name, a channel ID, or a user ID for a direct message. The
  channel is a per-call argument, so one site can post to many channels.
- Send mrkdwn text, literal text with `mrkdwn: false`, or Block Kit blocks forwarded
  unchanged. Image blocks take public external URLs.
- Returns `{ ok, channel, ts }`.
- The server holds the bot token. One bot serves the whole deployment, and it must be
  a member of any channel it posts to.
- Who can post: site managers by default. To let visitors post, add
  `{ "slack": "visitors" }` to `_access.json`.
- Messages are sent only when page code calls `send()`: on a user action, or from an
  open tab reacting to a subscription. If several tabs react to the same event,
  deduplicate in code.
- The SDK retries 429s with backoff.

```js
const me = await spot.me();
if (me.slack_allowed) {
  await spot.slack.send({ channel: '#pets', text: '*New pet* hatched' });
}
```

## Network

- The browser can fetch any public URL subject to normal CORS.

## Access control

`_access.json` ships with the deploy:

- `allow`: emails or groups that may visit the site.
- Maintainers: delegated management rights.
- Visitor opt-ins for AI and Slack (`"slack": "visitors"`).

## Rate budgets per visitor

| Feature             | Budget              |
| ------------------- | ------------------- |
| Database            | 25 req/s            |
| Realtime room sends | 30 req/s            |
| Uploads             | 2 req/s             |
| AI                  | 1 per 2 s, burst 10 |
| Slack               | 1 req/s, burst 5    |
