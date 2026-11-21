# Zuzu: an AI buddy demo for 6–8-year-olds

A talking, seeing cartoon AI for **Young Leaders** demos. A child walks up, Zuzu wakes up, asks their name, recognises them from today's list ("Aarav! From Class 2!"), chats about their family, plays show-and-tell through the camera, and ends by explaining in three sentences what AI is.

Everything runs on **OpenAI only**: one realtime model (`gpt-realtime-2.1`) hears, sees snapshots and speaks. On-device MediaPipe handles instant reactions (waking when a face appears, smiling back, waving back).

| Doc | What's in it |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Goals, research-backed design rules, the 5-minute journey, requirements, compliance blockers |
| [docs/HLD.md](docs/HLD.md) | Architecture, deployment, data flow and privacy boundaries, safety layers, cost |
| [docs/LLD.md](docs/LLD.md) | Class diagrams, APIs, prompt design, sequence diagrams, user flows, algorithms |
| [reports/Kids AI buddy design research.md](reports/Kids%20AI%20buddy%20design%20research.md) | Child-psychology and child–AI research report (with citations) |

> ⚠️ **Before any session with real children:** OpenAI requires **Zero Data Retention** for processing personal data of under-13s. Request it from OpenAI sales for the project whose key you use, then set `ZDR_CONFIRMED=true`. Until then the app runs in **Rehearsal mode**: adults only. Also collect signed parental consent (see PRD §11).

## Quick start

Requirements: Node 22+, Chrome, a webcam and a microphone. An external speaker is strongly recommended.

```bash
npm install
cp .env.example .env     # then put your OPENAI_API_KEY in .env (an existing .env is fine)
npm start                # builds the UI and serves everything on http://localhost:8787
```

1. Open **http://localhost:8787/console**.
2. Add children (form, or **Import CSV** using [docs/children-template.csv](docs/children-template.csv)).
3. Click **Open Stage** and move that window to the TV or projector (F11 for full screen). Click once on the Stage to turn on its speaker and camera, and allow camera and mic when Chrome asks.
4. Mark a child **Up next** → ask the child if they want to talk to the computer helper → press **▶ Start**.

During development: `npm run dev` (UI on http://localhost:5173/console, API on :8787 with hot reload).

### Stage hotkeys

| Key | Action |
|---|---|
| Space | Start (when asleep) / nudge Zuzu to reply |
| **Esc** | **Stop immediately** (kill switch) |
| E | Say goodbye and finish |
| M / C | Mute Zuzu / camera on-off |
| 1–4 | Skip to: think game / family / show and tell / AI (what it is, how to use it wisely) |
| R | Reset to sleeping |
| \` | Show/hide the facilitator drawer (transcript + alerts) for single-screen setups |

## Configuration

See [.env.example](.env.example). Common changes:

- `REALTIME_MODEL=gpt-realtime-2.1-mini` cuts the cost by about two-thirds (~$0.15 instead of ~$0.50 per session). Test it with children's voices first.
- `VAD_EAGERNESS=medium` if Zuzu feels slow to reply (default `low` waits longer for children who pause).
- `NOISE_REDUCTION=near_field` if you use a close-up microphone.
- `BUDDY_NAME` / `ORG_NAME` to rebrand.

## Privacy by design

- Child details live only in `data/roster.json` on the laptop and are **auto-deleted after 24 h** (or immediately with "Delete all").
- **No audio, video, snapshot or transcript is ever saved.** Transcripts exist only in browser memory during the session.
- Only the identified child's minimal profile (first name, class, age band, language, grown-ups' labels and jobs, likes, topics to avoid, camera consent) is sent to OpenAI, as a tool result.
- Camera snapshots (512×384, at most one every 3 s) are sent only if the child's camera consent is on; on-device face, smile and gesture detection never leaves the laptop.
- `data/ops-log.jsonl` keeps anonymous stats (duration, turn counts, latency), never names or content.

## Development

```bash
npm test          # unit and API tests (no network)
npm run typecheck
```

Layout: `server/` (Express API, name matcher, prompt builder, key minter, moderation), `web/src/stage` (child-facing Stage: session controller, Agents SDK voice client, tools, guardrails, camera, MediaPipe, SVG character), `web/src/console` (facilitator Console), `shared/` (types and tool schemas).
