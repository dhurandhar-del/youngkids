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
npm install                               # installs all workspaces (frontend, backend, shared)
cp backend/.env.example backend/.env      # then put your OPENAI_API_KEY in backend/.env
npm start                                 # builds the frontend and serves everything on http://localhost:8787
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

See [backend/.env.example](backend/.env.example). Common changes:

- `REALTIME_MODEL=gpt-realtime-2.1-mini` cuts the cost by about two-thirds (~$0.15 instead of ~$0.50 per session). Test it with children's voices first.
- `VAD_EAGERNESS=medium` if Zuzu feels slow to reply (default `low` waits longer for children who pause).
- `NOISE_REDUCTION=near_field` if you use a close-up microphone.
- `BUDDY_NAME` / `ORG_NAME` to rebrand.

## Privacy by design

- Child details live only in `backend/data/roster.json` on the laptop and are **auto-deleted after 24 h** (or immediately with "Delete all").
- **No audio, video, snapshot or transcript is ever saved.** Transcripts exist only in browser memory during the session.
- Only the identified child's minimal profile (first name, class, age band, language, grown-ups' labels and jobs, likes, topics to avoid, camera consent) is sent to OpenAI, as a tool result.
- Camera snapshots (512×384, at most one every 3 s) are sent only if the child's camera consent is on; on-device face, smile and gesture detection never leaves the laptop.
- `backend/data/ops-log.jsonl` keeps anonymous stats (duration, turn counts, latency), never names or content.

## Project layout

```
frontend/   React + Vite app (Stage and Console). Deploys to Vercel or any static host.
backend/    Express API (roster, name matcher, prompt builder, OpenAI key minter, moderation). Deploys to EC2.
shared/     Types and tool schemas used by both (TypeScript source, imported as @zuzu/shared/*).
```

It is one npm workspace: always run `npm install` at the repo root.

## Deployment

### Backend on EC2

The backend keeps the roster in a JSON file (`backend/data/`), so it needs a server with a persistent disk. Don't put it on Vercel serverless functions: the file system there is temporary.

```bash
# On the instance (Node 22.12+)
git clone https://github.com/dhurandhar-del/youngkids.git && cd youngkids
npm ci --omit=dev
cp backend/.env.example backend/.env
```

In `backend/.env` set:

```
OPENAI_API_KEY=...
HOST=0.0.0.0
PORT=8787
CONSOLE_PIN=<a long random PIN>                     # required when HOST is not localhost
CORS_ORIGINS=https://your-app.vercel.app            # where the frontend is hosted
```

Run it with a process manager, e.g. `npm i -g pm2 && pm2 start "npm run start -w backend" --name zuzu-api && pm2 save && pm2 startup`.

**The backend must be served over HTTPS.** The Vercel frontend is HTTPS, and browsers block calls from an HTTPS page to an `http://` API. Point a domain (e.g. `api.example.com`) at the instance and put Caddy (automatic certificates) or nginx + certbot in front of port 8787. Open only 80/443 in the security group.

### Frontend on Vercel

1. Import the GitHub repo in Vercel.
2. Set **Root Directory** to `frontend`. Vercel detects the Vite framework and the npm workspace; `frontend/vercel.json` holds the build settings and the rewrites for `/console` and `/stage`.
3. Add the environment variable `VITE_API_URL=https://api.example.com` (your backend, no trailing slash) and deploy.

Then open `https://your-app.vercel.app/console` and enter the Console PIN.

### Everything on one server

`npm start` at the repo root builds the frontend and has the backend serve it (`SERVE_FRONTEND=true`), so the whole app runs on one port with no CORS setup.

## Development

```bash
npm test          # unit and API tests for all workspaces (no network)
npm run typecheck
```

Inside the frontend: `frontend/src/stage` (child-facing Stage: session controller, Agents SDK voice client, tools, guardrails, camera, MediaPipe, SVG character) and `frontend/src/console` (facilitator Console).
