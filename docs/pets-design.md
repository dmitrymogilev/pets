# Pets game design

How the game is built on Spot. Read `spot-platform.md` first. All logic runs
in the browser; there is no server and nothing runs on a schedule. Every
update happens on a user visit. Nobody visiting means nothing happens.

## Pages

- `/` gallery of all pets with live mood badges, link to create. Runs the
  daily digest check.
- `/create/` create a pet: name, template or custom avatar, who can care,
  Slack channel, description, soul.
- `/pet/?id=<doc id>` pet room: state, interaction input, live reactions,
  presence, owner tools. Runs the queue engine.
- `/test/` smoke tests for the platform calls, owner only. `/story/` is an
  unrelated animated page.

Shared code lives in `site/pets.js` as the global `Pets`; sound effects in
`site/sounds.js` as `PetsSounds`.

## Trust model

The site is an internal tool for colleagues who trust each other. "Who can
care" and the hidden soul are UI rules only; anyone can read every document
and call every API from devtools. Owner-only edit and dismiss are the only
server-enforced rules, through `updateMine`.

## Collections

Document updates replace the whole data object, so every writer sends the full
object, and a field that others increment can never live in a document that
someone replaces.

| Collection | One doc per | Written by | Fields |
|---|---|---|---|
| `pets` | pet | owner only (`updateMine`) | name, kind, emoji, avatar_url, description, soul, care (`owner` / `everyone` / `group`), carers, channel, dismissed_at |
| `pet_queue` | pet | anyone, `increment` only | pet_id, seq |
| `pet_state` | pet | holder of the front ticket | pet_id, applied_seq, food, mood, energy, health, mood_word, status_line, state_at, last_interaction_at |
| `interactions` | interaction | actor creates, processor updates | pet_id, kind, ticket, actor_alias, actor_name, text, status, claimed_at, claimed_by, reaction, memory, state_after, ai_error, slack_error, slack_ts, processed_at |
| `digests` | channel and day | first gallery visitor of the day | channel, date, pets, slack_ts, slack_error |

Custom avatars are uploaded to the file store; the pet keeps the URL. File
URLs are mesh-private, so Slack posts carry the emoji only.

## Queue

Interactions are serialized per pet with tickets from the atomic increment:

1. Create the interaction with status `queued`.
2. Increment `seq` on the pet's queue document. The returned value is the
   ticket. Write it onto the interaction.
3. Wait until `applied_seq` on the state document equals ticket minus one.
4. Mark the interaction `processing`, read fresh state, bake in decay, gather
   history, call the AI.
5. Write the new state with `applied_seq` set to the ticket, then mark the
   interaction `done` or `failed`, then post to Slack and record the result.

`Pets.queueTick` is the engine. Every open room runs it: every 2 seconds while
anything is pending, every 30 seconds otherwise, and on every live event.

Recovery rules, all based on `Pets.STALE_MS` (90 seconds):

- The front interaction has been queued or processing longer than that: any
  visitor takes it over and processes it on behalf of the actor.
- The front ticket has no interaction document and the state document has not
  moved for that long, and no fresh ticketless interaction exists: the visitor
  bumps `applied_seq` past the hole.
- The room has a watchdog: a tick that has not finished after twice that time
  no longer blocks the next tick.

Two visitors can in theory take over the same stale ticket within the same
second and double-post. That needs a crashed tab plus a coincidence, and is
accepted.

A failed AI call still advances the queue; the interaction is marked `failed`
with the error, and decay is baked into the state.

## State and decay

Four numbers from 0 to 100: food, mood, energy, health. Decay is a pure
function of the stored numbers, `state_at`, and the current time
(`Pets.effectiveState`), so every reader computes the same value and no writes
are needed. Per hour: food falls 4, mood drifts toward 50 by 2 and falls 3 more
while food is under 25, health falls 2 while food is under 15 and rises 2 while
food is at least 50. Energy rises 3 while food is at least 50, holds between 25
and 49, falls 2 while food is under 25, falls 4 while food is under 15, and
falls 2 more while health is under 50. From full stats a neglected pet is
exhausted after about 45 hours and at zero on everything after about 71. The
model returns absolute values; the client clamps them to 0 to 100 and to at
most 30 points of change.

## Prompt

System prompt: name, kind, description, soul, age, alias rules, output
schema. User prompt: effective state, time since the last visit, up to 5
memories of this actor, up to 10 recent memories of everyone, then the text in
`<<< >>>`. People appear only as aliases (`u_` plus 8 hex characters of a
SHA-256 of the email). The client swaps aliases for display names in the reply.
The reply is JSON: reaction, memory (one third-person sentence that keeps the
facts), mood_word, status_line, state. The memory is what gets stored as
history and what goes to Slack, not the raw text.

## Slack

Default channel is `#pets-private`. Messages from a `pets-local-` host are
prefixed with `[test]`. Posts: hatch on create, one per reaction, farewell on
dismiss, and a daily digest per channel listing pets that need attention
(food under 20, health under 40, or no visit for 3 days). The digest is
triggered by any gallery visit; the earliest `digests` document for the
channel and date wins, and only its creator posts.

## Sounds

`site/sounds.js` (global `PetsSounds`) synthesizes every effect with the Web
Audio API; there are no audio files. Sounds: hatch on create (played inside
the submit handler before navigating, since the room loads without a
gesture), a tick on send, the reaction when an interaction sent from this
tab reaches `done`, and a low thud when it reaches `failed`. Other people's
interactions and replayed history are silent. The reaction is a burst of
blips in the pet's voice, pitched per kind (custom pets hash their id),
bent by the direction of the state change (`Pets.stateTone`: weighted sum
of the four deltas, mood counted twice, within 8 is neutral) and slowed by
low energy, followed by a rising, flat, or falling cadence. The header
button toggles sound and remembers it in localStorage `pets-sound`;
default on, low master volume.

## Errors

Every external call is wrapped. Errors show in the page's error panel with
code and message; AI and Slack errors are also stored on the interaction so
other visitors see them in the reactions list.
