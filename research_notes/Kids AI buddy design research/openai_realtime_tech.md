# OpenAI Realtime API and browser tech for a voice + camera kids' agent (state as of 20 Nov 2026)

Method note: OpenAI's docs pages were read as raw Markdown (append `.md` to any developers.openai.com docs URL). Code marked **verbatim** is copied from those pages. Code marked **composed** is my own, built only from documented fields; test it before shipping. Anything sourced only from 2025 or from third-party sites is flagged **[2025 source]** or **[secondary]**.

---

## 1. Realtime model lineup, image support, context, pricing, recommendation, and session cost

### Takeaway
The current Realtime speech-to-speech models are **`gpt-realtime-2.1`** (flagship reasoning voice model) and **`gpt-realtime-2.1-mini`** (cheaper, faster distilled version). Both take image input, support function calling, and have a 128k context window. The mini costs about a third as much per audio token and about a sixth as much per image token. OpenAI now points new conversational voice apps to a separate product, **GPT-Live (`gpt-live-1.1`)**, but GPT-Live takes only audio and text, with no image input. For a camera-aware agent, the Realtime `gpt-realtime-2.1` family is the right fit.

### Cited Findings
- **Current models and IDs**
  - `gpt-realtime-2.1` is a "Reasoning model with tool use". It updates GPT-Realtime-2 with "better alphanumeric recognition, silence and noise handling, and interruption behavior". Specs:
    - Input: text, audio, image. Output: text, audio.
    - 128,000-token context window, 32,000 max output tokens, knowledge cutoff Sep 30, 2024.
    - Reasoning tokens supported, with configurable reasoning effort.
    - Supports function calling and prompt caching. Only snapshot: `gpt-realtime-2.1`.
    - Only the `v1/realtime` endpoint is supported (not Live, Responses or Chat Completions).
    - [gpt-realtime-2.1 model page](https://developers.openai.com/api/docs/models/gpt-realtime-2.1)
  - `gpt-realtime-2.1-mini` is a "distilled reasoning model for faster, lower-cost realtime voice interactions". Specs:
    - Input: text, audio, **image**. Output: text, audio.
    - 128,000-token context, 32,000 max output tokens.
    - Supports function calling and prompt caching. The page does not list reasoning-effort levels.
    - [gpt-realtime-2.1-mini model page](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini)
  - Default rate limits are the same for both 2.1 models: Build tier 400 RPM / 200,000 TPM; Launch 10,000 RPM / 4,000,000 TPM; Grow 20,000 RPM / 15,000,000 TPM — [gpt-realtime-2.1 page](https://developers.openai.com/api/docs/models/gpt-realtime-2.1), [mini page](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini)
  - `gpt-realtime-2`: "our most capable realtime voice model". Takes text, audio and image input, 128k context, 32k max output, configurable reasoning effort — [gpt-realtime-2 page](https://developers.openai.com/api/docs/models/gpt-realtime-2)
  - `gpt-realtime-1.5`: text, audio and image input, but only a **32,000** context window and 4,096 max output tokens. The prompting guide calls it the pick when "You need a fast, reliable non-reasoning speech-to-speech model." — [gpt-realtime-1.5 page](https://developers.openai.com/api/docs/models/gpt-realtime-1.5), [Prompting Realtime models](https://developers.openai.com/api/docs/guides/realtime-models-prompting)
  - Release date of 2.1 and 2.1-mini: "released gpt-realtime-2.1 and gpt-realtime-2.1-mini on July 6, 2026, cutting p95 voice latency by at least 25%" — [DataNorth, secondary](https://datanorth.ai/news/openai-releases-gpt-realtime-2-1-voice-models). OpenAI's deprecation table is consistent with this: it lists `gpt-realtime-2.1` as the replacement for `gpt-realtime` from **Jul 20, 2026**. — [Deprecations](https://developers.openai.com/api/docs/deprecations)
- **Deprecated or shut-down models (do not build on these)**
  - `gpt-realtime` and `gpt-realtime-2025-08-28` shut down **Jan 20, 2027**; replacement is `gpt-realtime-2.1`.
  - `gpt-realtime-mini` and `gpt-realtime-mini-2025-12-15` shut down **Jan 20, 2027**; replacement is `gpt-realtime-2.1-mini`.
  - `gpt-4o-realtime-preview*` shut down **May 7, 2026**.
  - The `OpenAI-Beta: realtime=v1` beta interface shut down **May 12, 2026**.
  - `tts-1` and `gpt-4o-mini-tts` shut down Jan 6, 2027, with `gpt-realtime-2.1-mini` named as the replacement.
  - [Deprecations](https://developers.openai.com/api/docs/deprecations)
- **Pricing per 1M tokens** ([Pricing](https://developers.openai.com/api/docs/pricing); also on the model pages):

  | Model | Text in / cached / out | Audio in / cached / out | Image in / cached |
  |---|---|---|---|
  | gpt-realtime-2.1 | $4.00 / $0.40 / $24.00 | $32.00 / $0.40 / $64.00 | $5.00 / $0.50 |
  | gpt-realtime-2.1-mini | $0.60 / $0.06 / $2.40 | $10.00 / $0.30 / $20.00 | $0.80 / $0.08 |
  | gpt-realtime-2 | $4.00 / $0.40 / $24.00 | $32.00 / $0.40 / $64.00 | $5.00 / $0.50 |
  | gpt-realtime-1.5 | $4.00 / $0.40 / $16.00 | $32.00 / $0.40 / $64.00 | $5.00 / $0.50 |
  | gpt-realtime (deprecated) | $4.00 / $0.40 / $16.00 | $32.00 / $0.40 / $64.00 | $5.00 / $0.50 |
  | gpt-realtime-mini (deprecated) | $0.60 / $0.06 / $2.40 | $10.00 / $0.30 / $20.00 | $0.80 / $0.08 |

- **Transcription prices** (when used as input transcription; billed separately):
  - `gpt-4o-mini-transcribe` $0.003/min
  - `gpt-transcribe` $0.0045/min
  - `gpt-4o-transcribe` $0.006/min
  - `gpt-live-transcribe` $0.017/min
  - `gpt-realtime-whisper` $0.017/min
  - `omni-moderation-latest` is **free**.
  - [Pricing](https://developers.openai.com/api/docs/pricing)
- **How tokens are counted**
  - "Audio tokens in user messages are 1 token per 100 ms of audio, while audio tokens in assistant messages are 1 token per 50ms of audio."
  - Every response re-reads the whole conversation. In OpenAI's example, turn 2 is billed for "110 text and 64 audio tokens for input", and earlier turns are "likely to be cached".
  - Per-response usage reports `image_tokens` and `cached_tokens_details`.
  - "Changing these [instructions and tool definitions] mid-session will reduce the cache rate for subsequent turns."
  - [Realtime cost optimization](https://developers.openai.com/api/docs/guides/realtime-costs)
- **Truncation controls**
  - `session.truncation` accepts `{type:"retention_ratio", retention_ratio:0.8, token_limits:{post_instructions:8000}}` (the docs' example), or `"disabled"`.
  - A ratio below 1 "drop[s] more messages than necessary", so truncation happens less often and cache busting is reduced.
  - [Realtime cost optimization](https://developers.openai.com/api/docs/guides/realtime-costs)
- **Tokens per image for realtime models are not documented.**
  - The Images & vision guide's patch table (32 px patches × a per-model multiplier) and tile table (base + tile tokens) do not list any `gpt-realtime*` model — [Images and vision](https://developers.openai.com/api/docs/guides/images-vision)
  - A 2025 webrtcHacks test billed about "$0.06751" for a 640×360 image, and about the same for 1280×720 and 1920×1080. The author did not trust the numbers and guessed that realtime may use a fixed, "low"-detail-style token count — [webrtcHacks, Sept 2025, 2025 source](https://webrtchacks.com/how-openai-does-webrtc-in-the-new-gpt-realtime/)
- **GPT-Live (`gpt-live-1.1`), the alternative**
  - Full-duplex: it can listen while it speaks.
  - Input: audio and text only. The model page does not list image input.
  - Billed per minute: **$0.05/min active**, **$0.02/min standby**, plus backend model and tool usage.
  - Endpoint `v1/live/sessions`. `v1/realtime` is not supported.
  - [gpt-live-1.1 model page](https://developers.openai.com/api/docs/models/gpt-live-1.1)
  - OpenAI's audio overview now says "For a new conversational voice application, start with GPT-Live", and "Use the Realtime API when you need its session and tool model." — [Audio and voice](https://developers.openai.com/api/docs/guides/audio)
  - A WebRTC GPT-Live session bills 15 seconds of voice time at initialization. This is credited against duration charges once the session runs. — [WebRTC guide](https://developers.openai.com/api/docs/guides/realtime-webrtc)
- Maximum Realtime session length: **60 minutes** — [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations)

### Inferences
- **Model choice**
  - Use the **Realtime API**, not GPT-Live. GPT-Live has no documented image input, and seeing the child's webcam is a core requirement.
  - Between the two Realtime models: `gpt-realtime-2.1-mini` is the cost and latency default. `gpt-realtime-2.1` is the quality and safety upgrade if evals with real child audio show the mini follows instructions less reliably.
  - Avoid `gpt-realtime-1.5`. Its 32k context fills quickly once images accumulate.
- **Cost model for a 5-minute session.** All of these are my assumptions; verify against `response.done.usage`.
  - The child speaks about 120 s and the agent speaks about 120 s, over about 30 responses.
  - Instructions plus tools come to about 1,500 text tokens.
  - About 2,000 output text tokens (transcript text plus low-effort reasoning). The reasoning share is a guess.
  - Audio: 120 s × 10 tokens/s = 1,200 user tokens; 120 s × 20 tokens/s = 2,400 assistant tokens.
  - Each audio token is billed once uncached as input. Re-reads are cached: about 50k cached audio token-reads and about 50k cached text token-reads.
  - **Baseline without images:**
    - 2.1 ≈ $0.115 (audio in) + $0.020 (cached audio) + $0.028 (text in) + $0.154 (audio out) + $0.048 (text out) ≈ **$0.36 per 5 min (about $0.07/min)**
    - 2.1-mini ≈ $0.036 + $0.015 + $0.004 + $0.048 + $0.005 ≈ **$0.11 per 5 min (about $0.02/min)**
  - **Images** (T = tokens per image, which is undocumented).
    - I assume T ≈ 250 for a 512×384 JPEG. A 32 px patch count gives 16×12 = 192, and the gpt-4o-style tile formula gives 85 + 170 = 255. This is an assumption, not a documented value.
    - Images stay in context, so every later response re-reads them at the cached image rate.
    - **(a) 1 image every 3 s** (100 images, 25k image tokens; about 375k image token-reads over 30 responses, of which 25k are uncached):
      - 2.1: $0.125 + $0.175 ≈ **$0.30** (≈ $1.20 if T = 1,000)
      - mini: $0.020 + $0.028 ≈ **$0.05** (≈ $0.19 if T = 1,000)
    - **(b) 1 image per user turn** (about 25 images, 6.25k tokens):
      - 2.1 ≈ **$0.075** (≈ $0.30 if T = 1,000)
      - mini ≈ **$0.012** (≈ $0.05 if T = 1,000)
  - **Input transcription** (for captions/moderation): $0.006–0.015 per 5 min with `gpt-4o-mini-transcribe`, or about $0.03–0.085 with `gpt-live-transcribe`. Whether billing covers speech only or all streamed audio is unverified.
  - **Totals per 5-minute session:**
    - 2.1 + per-turn images ≈ **$0.45**
    - 2.1 + every-3 s images ≈ **$0.67**
    - mini + per-turn images ≈ **$0.13**
    - mini + every-3 s images ≈ **$0.17**
  - For comparison, GPT-Live voice alone would be $0.25 per 5 active minutes plus backend charges, and it still could not see images.
- The every-3 s cadence also grows the context by about 25k tokens per 5 minutes. That is fine for 128k models within one session, but it adds prefill work on every response and risks the model commenting on stale frames.

### Gaps
- No official tokens-per-image figure exists for `gpt-realtime-2.1` or the mini at any `detail` level. Measure it by sending test frames and reading `response.done.response.usage.input_token_details.image_tokens`.
- No official latency figures (time to first audio) for 2.1 vs 2.1-mini. The "≥25% p95" claim is secondary.
- Release dates for 2.1 and 2.1-mini come from a secondary source only.

---

## 2. Browser connection: WebRTC + ephemeral client secrets, unified interface, Agents SDK

### Takeaway
There are two documented browser paths:
- **Ephemeral key:** your Node server calls `POST https://api.openai.com/v1/realtime/client_secrets` and gets an `ek_...` value. The browser then POSTs its SDP offer to `https://api.openai.com/v1/realtime/calls` with `Authorization: Bearer ek_...` and `Content-Type: application/sdp`.
- **Unified interface:** the browser posts its SDP to your server, and the server sends a multipart `sdp` + `session` form to `/v1/realtime/calls` with the real API key. OpenAI calls this the simpler, faster-connecting option, but it puts your server in the session-setup path.

In both, events travel on a data channel labeled `oai-events`. OpenAI recommends starting browser speech-to-speech apps with the Agents SDK (`@openai/agents`, import from `@openai/agents/realtime`, v0.22.0). Its default model is `gpt-realtime-2.1`, and it handles WebRTC, mic and speaker for you.

### Cited Findings
- **Options and recommendation**
  - "The Realtime API supports two mechanisms for connecting from the browser: the unified interface and ephemeral API keys... Use the unified interface for simpler setup and faster connections. This approach puts your application server in the critical path for session initialization." — [WebRTC guide](https://developers.openai.com/api/docs/guides/realtime-webrtc)
  - The Realtime getting-started guide "starts with the Agents SDK for a browser application; use the lower-level connection guides when you need direct control." — [Realtime getting started](https://developers.openai.com/api/docs/guides/realtime)
- **Ephemeral key server, verbatim**

  ```typescript
  const sessionConfig = JSON.stringify({
    session: {
      type: "realtime",
      model: "gpt-realtime-2.1",
      audio: {
        output: {
          voice: "marin",
        },
      },
    },
  });
  app.get("/token", async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      const response = await fetch(
        "https://api.openai.com/v1/realtime/client_secrets",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
            "OpenAI-Safety-Identifier": "hashed-user-id",
          },
          body: sessionConfig,
        }
      );
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) { /* ... */ }
  });
  ```
  — [WebRTC guide](https://developers.openai.com/api/docs/guides/realtime-webrtc)
- **Client secret request and response fields**
  - Body: `expires_after: { anchor: "created_at", seconds }`, where `seconds` defaults to **600** and ranges from **10 to 7200**, plus `session` (a realtime or transcription session config).
  - Response: `value` (for example `"ek_68af..."`), `expires_at`, and the effective `session`.
  - [Client secrets reference](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create)
  - The Agents SDK quickstart: "The response contains a top-level `value` field that starts with the `ek_` prefix". — [Agents SDK quickstart source](https://github.com/openai/openai-agents-js/blob/main/docs/src/content/docs/guides/voice-agents/quickstart.mdx)
- **Browser connection with an ephemeral key, verbatim**

  ```typescript
  const tokenResponse = await fetch("/token");
  const data = await tokenResponse.json();
  const EPHEMERAL_KEY = data.value;
  const pc = new RTCPeerConnection();
  audioElement.current = document.createElement("audio");
  audioElement.current.autoplay = true;
  pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);
  const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
  pc.addTrack(ms.getTracks()[0]);
  const dc = pc.createDataChannel("oai-events");
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    body: offer.sdp,
    headers: {
      Authorization: `Bearer ${EPHEMERAL_KEY}`,
      "Content-Type": "application/sdp",
    },
  });
  const answer = { type: "answer", sdp: await sdpResponse.text() };
  await pc.setRemoteDescription(answer);
  ```
  — [WebRTC guide](https://developers.openai.com/api/docs/guides/realtime-webrtc)
- **Unified interface server, verbatim excerpt**
  - The server parses the raw SDP with `express.text({ type: ["application/sdp", "text/plain"] })`.
  - It then sends:

    ```typescript
    const fd = new FormData(); fd.set("sdp", req.body); fd.set("session", sessionConfig);
    fetch("https://api.openai.com/v1/realtime/calls", { method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "OpenAI-Safety-Identifier": "hashed-user-id" }, body: fd })
    ```
  - It returns the answer as `application/sdp` and forwards any `Location` header.
  - Here `sessionConfig` is `{type:"realtime", model:"gpt-realtime-2.1", audio:{output:{voice:"marin"}}}`, with no `session` wrapper.
  - The browser posts `offer.sdp` to `/session` with `Content-Type: application/sdp`.
  - [WebRTC guide](https://developers.openai.com/api/docs/guides/realtime-webrtc)
- **Sending events, verbatim excerpt**: the guide's example checks `dc.readyState`. If it is `"connecting"` it waits for `open` with `{ once: true }`; if it is closed it throws. — [WebRTC guide](https://developers.openai.com/api/docs/guides/realtime-webrtc)
- **Server sideband (optional, for server-run tools and moderation)**
  - The SDP response "will contain a `Location` header that has a unique call ID" (for example `/v1/realtime/calls/rtc_123456`).
  - Your server can then open `wss://api.openai.com/v1/realtime?call_id=rtc_xxxxx` with the standard API key, send `session.update`, and receive all events.
  - [Server-side controls](https://developers.openai.com/api/docs/guides/realtime-server-controls)
- **Faster connection setup with WARP** (WebRTC Abridged Roundtrip Protocol)
  - WARP combines DTLS 1.3, SPED and SNAP to cut connection setup time.
  - Browser support:
    - "Chrome supports DTLS 1.3 without an origin trial."
    - "Chrome 151–156 supports SNAP through an origin trial."
    - For SPED, "No browser origin trial is available."
  - [WebRTC with WARP](https://developers.openai.com/api/docs/guides/realtime-webrtc-warp)
- **Safety identifier**: "For Realtime API requests, send the identifier in the `OpenAI-Safety-Identifier` header. When using ephemeral tokens, set the header on the server-side request that creates the client secret". OpenAI says to use "a stable, privacy-preserving value, such as a hashed internal user ID." — [Realtime getting started](https://developers.openai.com/api/docs/guides/realtime)
- **Agents SDK**
  - Packages: `npm install @openai/agents zod`, which "requires Zod v4". Import from `@openai/agents/realtime`; the standalone `@openai/agents-realtime` also works. — [Agents SDK quickstart source](https://github.com/openai/openai-agents-js/blob/main/docs/src/content/docs/guides/voice-agents/quickstart.mdx)
  - Latest npm versions: `@openai/agents` **0.22.0**, `@openai/agents-realtime` **0.22.0**, `openai` **7.62.0** — [npm registry @openai/agents](https://www.npmjs.com/package/@openai/agents), [@openai/agents-realtime](https://www.npmjs.com/package/@openai/agents-realtime), [openai](https://www.npmjs.com/package/openai)
  - Default model: `DEFAULT_OPENAI_REALTIME_MODEL = 'gpt-realtime-2.1'`. The SDK's model list includes `'gpt-realtime-2.1-mini'`. — [openaiRealtimeBase.ts](https://github.com/openai/openai-agents-js/blob/main/packages/agents-realtime/src/openaiRealtimeBase.ts)
  - Minimal browser code, verbatim:

    ```typescript
    import { RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";
    const agent = new RealtimeAgent({ name: "Assistant", instructions: "You are a helpful voice assistant." });
    const session = new RealtimeSession(agent, { model: "gpt-realtime-2.1" });
    await session.connect({ apiKey: ephemeralKey });
    ```
    — [Realtime getting started](https://developers.openai.com/api/docs/guides/realtime)
  - "In the browser, this connects to the Realtime API using WebRTC and automatically configures microphone capture and audio playback". The SDK "sends the initial session configuration as soon as the data channel opens and tries to wait for the matching `session.updated` acknowledgement before `connect()` resolves". — [Agents SDK quickstart source](https://github.com/openai/openai-agents-js/blob/main/docs/src/content/docs/guides/voice-agents/quickstart.mdx)
  - `OpenAIRealtimeWebRTC` options include `baseUrl` (default `https://api.openai.com/v1/realtime/calls`), `audioElement`, `mediaStream`, `useInsecureApiKey` and `changePeerConnection`. In a browser, a non-ephemeral key is rejected unless `useInsecureApiKey` is set. — [openaiRealtimeWebRtc.ts](https://github.com/openai/openai-agents-js/blob/main/packages/agents-realtime/src/openaiRealtimeWebRtc.ts)
  - "A `mediaStream` you pass to `OpenAIRealtimeWebRTC` remains owned by your application... so you can keep using it for a level meter". — [Agents SDK transport guide source](https://github.com/openai/openai-agents-js/blob/main/docs/src/content/docs/guides/voice-agents/transport.mdx)
  - "Function tools run in the same environment as your `RealtimeSession`... If you need to perform sensitive actions, call your backend from inside the tool". — [Agents SDK build guide source](https://github.com/openai/openai-agents-js/blob/main/docs/src/content/docs/guides/voice-agents/build.mdx)
- **Beta to GA migration**
  - Remove the `OpenAI-Beta: realtime=v1` header.
  - Use `POST /v1/realtime/client_secrets` and `/v1/realtime/calls`.
  - Set `session.type`, and move output audio config under `session.audio.output`.
  - Use the new event names `response.output_text.delta`, `response.output_audio.delta` and `response.output_audio_transcript.delta`.
  - [Realtime getting started](https://developers.openai.com/api/docs/guides/realtime)

### Inferences
- **Recommended setup for this app.** The Agents SDK in the React front end, with the Node backend minting an ephemeral client secret. Put the full session config in that server-side request: model, instructions, tools, VAD, transcription and voice. That keeps the config and API key on the server, and lets the SDK handle mic, playback and interruption.
  - Pass your own `audioElement` (for lip-sync) and `mediaStream` (so the mic stream can be shared with level meters).
  - Profile lookup runs as a browser `tool()` whose `execute` calls your backend, as the SDK documents.
- **Drop to raw WebRTC, or add the server sideband,** if you want tool execution and transcript moderation to run entirely on the server. Use the `call_id` from the `Location` header for this.
  - Unverified: whether the browser can read the `Location` header on a cross-origin response from api.openai.com, which depends on CORS exposing it. With the unified interface the server sees the header directly.
- **Composed server example: mint a client secret with a kids-specific config** (fields from the [client_secrets reference](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create)):

  ```ts
  // server.ts (Node 20+, Express)
  app.get("/api/realtime-token", requireParentSession, async (req, res) => {
    res.set("Cache-Control", "no-store");
    const r = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Safety-Identifier": sha256(req.household.id),
      },
      body: JSON.stringify({
        expires_after: { anchor: "created_at", seconds: 600 },
        session: buildKidsSession(req.household), // see Section 4 / Design implications
      }),
    });
    res.status(r.status).json(await r.json()); // browser uses .value ("ek_...")
  });
  ```
- **Composed Agents SDK browser example** (React effect body):

  ```ts
  import { RealtimeAgent, RealtimeSession, OpenAIRealtimeWebRTC, tool } from "@openai/agents/realtime";
  import { z } from "zod";

  const lookupChildProfile = tool({
    name: "lookup_child_profile",
    description: "Look up the child's saved profile after they say their first name.",
    parameters: z.object({ first_name: z.string() }),
    async execute({ first_name }) {
      const r = await fetch("/api/profile/lookup", { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ first_name }) });
      return await r.text(); // JSON string returned to the model as tool output
    },
  });

  const agent = new RealtimeAgent({ name: "Buddy", instructions: BUDDY_PROMPT, tools: [lookupChildProfile] });
  const audioElement = document.createElement("audio"); audioElement.autoplay = true;
  const session = new RealtimeSession(agent, {
    transport: new OpenAIRealtimeWebRTC({ audioElement }),
    model: "gpt-realtime-2.1-mini",
    config: {
      outputModalities: ["audio"],
      reasoning: { effort: "low" },
      audio: {
        input: {
          transcription: { model: "gpt-4o-mini-transcribe", language: "en" },
          turnDetection: { type: "semantic_vad", eagerness: "low", createResponse: true, interruptResponse: true },
        },
        output: { voice: "marin" },
      },
    },
  });
  const { value: ek } = await (await fetch("/api/realtime-token")).json();
  await session.connect({ apiKey: ek });
  ```
  - The SDK's camelCase keys `noiseReduction` and `output.voice` are not shown in the official examples I read. Check them against the SDK types, or set those fields only in the server-minted session.

### Gaps
- No measured connection-time comparison between the unified interface and the ephemeral-key flow.
- Unverified: whether the ephemeral key must remain valid for the whole session or only for the SDP exchange. The docs only give its 10 s–2 h lifetime.
- Unverified: whether the `Location` header is CORS-exposed to browsers.

---

## 3. Sending webcam images: event shape, data-channel size limits, resolution, video tracks

### Takeaway
- **Event:** send a `conversation.item.create` user message with an `input_image` content part. `image_url` is a base64 data URI (PNG or JPEG), and the optional `detail` is `auto|low|high`, where auto means high. It goes over the same `oai-events` data channel. In the SDK, call `session.addImage(dataUrl, { triggerResponse: false })`.
- **Video:** a WebRTC video track is not a documented input to the Realtime model. Send still frames.
- **Size:** OpenAI does not document a per-message size limit for the data channel. Keep frames small (about 512 px wide JPEG, roughly 30–60 KB) and check `pc.sctp.maxMessageSize` at runtime.

### Cited Findings
- **Event shape, verbatim**

  ```typescript
  const event = {
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "user",
      content: [
        {
          type: "input_image",
          image_url: `data:image/{format};base64,${base64Image}`,
        },
      ],
    },
  };
  // WebRTC data channel and WebSocket both have .send()
  dataChannel.send(JSON.stringify(event));
  ```
  — [Realtime conversations: Image inputs](https://developers.openai.com/api/docs/guides/realtime-conversations)
- The same guide says "`gpt-realtime-2` and `gpt-realtime` also support image input". The 2.1 and 2.1-mini model pages list image input. — [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations), [gpt-realtime-2.1](https://developers.openai.com/api/docs/models/gpt-realtime-2.1), [gpt-realtime-2.1-mini](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini)
- **Content-part fields in `conversation.item.create`:**
  - `detail: optional "auto" or "low" or "high" (default: "auto")`. "The detail level of the image (for `input_image`). `auto` will default to `high`."
  - `image_url`: "Base64-encoded image bytes (for `input_image`) as a data URI... Supported formats are PNG and JPEG."
  - [Client events reference](https://developers.openai.com/api/reference/resources/realtime/client-events)
- **Agents SDK, verbatim:** `session.addImage(imageDataUrl, { triggerResponse: false }); session.sendMessage('Describe what is in this image.');` The guide adds: "Passing `triggerResponse: false` lets you batch the image with a later text or audio turn before asking the model to respond." By default `addImage()` triggers a response. — [Agents SDK build guide source](https://github.com/openai/openai-agents-js/blob/main/docs/src/content/docs/guides/voice-agents/build.mdx), [addImage.ts example](https://github.com/openai/openai-agents-js/blob/main/examples/docs/voice-agents/addImage.ts)
- **Documented size limits**
  - `input_audio_buffer.append` allows up to 15 MiB per event.
  - Text content parts have `maxLength: 256000` characters.
  - No image or data-channel message limit is stated.
  - [Realtime API reference](https://developers.openai.com/api/reference/resources/realtime)
- **Data-channel message size (browser side)**
  - `RTCSctpTransport.maxMessageSize` "indicates the maximum size of a message that can be sent using the RTCDataChannel.send() method" — [MDN](https://developer.mozilla.org/docs/Web/API/RTCSctpTransport/maxMessageSize)
  - A web-platform test expects 65536 when the remote SDP has no max-message-size attribute — [WPT RTCSctpTransport-maxMessageSize](https://chromium.googlesource.com/external/w3c/web-platform-tests/+/8fadb381209a215280dc3ad96d0f135b6005f176/webrtc/RTCSctpTransport-maxMessageSize.html)
  - The "256 KB" figure often quoted for Chrome is not confirmed for current Chrome.
- **Video tracks [2025 source]**
  - webrtcHacks reported that adding `video: true` to the offer "works", and that OpenAI's offer advertises H.264.
  - But "Video ingestion is not covered anywhere in the docs."
  - OpenAI's Sean DuBois described an "image-over-WebSocket gateway mechanism" that sends images, and advised high resolution at low FPS.
  - [webrtcHacks, Sept 2025](https://webrtchacks.com/how-openai-does-webrtc-in-the-new-gpt-realtime/)
  - The current WebRTC guide covers audio tracks only — [WebRTC guide](https://developers.openai.com/api/docs/guides/realtime-webrtc)
- Vision guidance for other models: with `detail:"low"`, images "fit within 512 × 512 pixels" — [Images and vision](https://developers.openai.com/api/docs/guides/images-vision)

### Inferences
- **Recommended frame**
  - 512×384 (4:3) or 512×288 (16:9) JPEG at quality 0.6–0.7, usually about 25–50 KB, or about 35–65 KB as base64.
  - That stays under the conservative 64 KiB default even when Chrome advertises less. Re-encode smaller or at lower quality if `JSON.stringify(event).length > pc.sctp.maxMessageSize`.
  - Under the WebRTC spec, an oversized `send()` throws. This is my understanding, not verified for current Chrome.
- **Use `detail:"low"` by default** for cost and latency, because "auto" means "high". Switch to `"high"` only when the child says "look at this" or similar.
- **Do not send `response.create` after periodic frames.** Images should be context for the next turn, not triggers. In the SDK, always pass `triggerResponse:false`.
- **Composed snapshot helper:**

  ```ts
  const canvas = Object.assign(document.createElement("canvas"), { width: 512, height: 384 });
  function sendSnapshot(dc: RTCDataChannel, pc: RTCPeerConnection, video: HTMLVideoElement, detail: "low" | "high" = "low") {
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    let q = 0.7, msg = "";
    do {
      const dataUrl = canvas.toDataURL("image/jpeg", q);
      msg = JSON.stringify({ type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_image", image_url: dataUrl, detail }] } });
      q -= 0.15;
    } while (msg.length > (pc.sctp?.maxMessageSize ?? 65536) - 1024 && q > 0.2);
    if (dc.readyState === "open") dc.send(msg);
  }
  ```

### Gaps
- No official statement on the maximum size of a data-channel event or of an image in Realtime.
- Chrome's current advertised `maxMessageSize` is unconfirmed. Measure it with `pc.sctp.maxMessageSize` after connecting.
- No official guidance on the best image resolution or cadence for realtime models.
- Whether a WebRTC video track is ingested at all, as of Nov 2026, is undocumented. The only evidence is from 2025.

---

## 4. Session configuration: instructions, voices, speed, VAD, transcription, noise reduction, limits, reasoning, tools, mid-session updates

### Takeaway
Everything lives under `session`, as in `{ type:"realtime", model, instructions, output_modalities, audio:{ input:{ format, noise_reduction, transcription, turn_detection }, output:{ format, voice, speed } }, reasoning:{effort}, tools, tool_choice, max_output_tokens, truncation }`. The main limits and options:
- **Voice:** set it before the first audio, because it cannot change afterwards.
- **Speed:** 0.25–1.5.
- **Turn detection:** `semantic_vad` with `eagerness` low/medium/high, which wait at most 8 s, 4 s and 2 s. Or `server_vad`, with `silence_duration_ms` defaulting to 500, `prefix_padding_ms` to 300, `threshold` to 0.5, and an optional `idle_timeout_ms` of 5–30 s.
- **Noise reduction:** `near_field` or `far_field`.
- **Reasoning effort:** minimal, low, medium, high or xhigh. The default is low.
- **Function calls:** the model emits a `function_call` item. You reply with a `function_call_output` item, then send `response.create`.

### Cited Findings
- **`session.update` shape, verbatim excerpt:** `{type:"session.update", session:{type:"realtime", model:"gpt-realtime-2.1", output_modalities:["audio"], audio:{input:{format:{type:"audio/pcm",rate:24000}, turn_detection:{type:"semantic_vad"}}, output:{format:{type:"audio/pcm",rate:24000}, voice:"marin"}}, ...}}`. "Most session properties can be updated at any time, except for the `voice`... after the model has responded with audio once". — [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations)
- **Voices**
  - "Current voice options are `alloy`, `ash`, `ballad`, `coral`, `echo`, `sage`, `shimmer`, `verse`, `marin`, and `cedar`... For best quality, we recommend using `marin` or `cedar`." — [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations)
  - The reference adds that the default voice is `"alloy"`, and that a custom voice object `{ id }` is accepted — [Client secrets reference](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create)
  - "Custom Voices are available only to approved customers." — [Prompting Realtime models](https://developers.openai.com/api/docs/guides/realtime-models-prompting)
- **Speed**
  - `speed: optional number (default: 1)`. "0.25 is the minimum speed. 1.5 is the maximum speed. This value can only be changed in between model turns". — [Client secrets reference](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create)
  - "the `speed` parameter changes playback rate, not how the model composes speech. To actually sound faster, add instructions that can guide the pacing." — [Prompting Realtime models](https://developers.openai.com/api/docs/guides/realtime-models-prompting)
- **Turn detection** (at `session.audio.input.turn_detection`)
  - **`server_vad`**:
    - `threshold` defaults to 0.5. A higher value "require[s] louder audio to activate".
    - `prefix_padding_ms` defaults to 300 ms.
    - `silence_duration_ms` defaults to 500 ms. "With shorter values the model will respond more quickly, but may jump in on short pauses".
    - `create_response` defaults to true. `interrupt_response` defaults to true; it cancels an ongoing response when speech starts.
    - `idle_timeout_ms` (min 5000, max 30000) triggers a response after a silence that starts "after the last model response's audio has finished playing". It emits `input_audio_buffer.timeout_triggered`, and is "currently only supported for `server_vad` mode".
  - **`semantic_vad`**:
    - "`low` will wait longer for the user to continue speaking, `high` will respond more quickly. `auto` is the default and is equivalent to `medium`. `low`, `medium`, and `high` have max timeouts of 8s, 4s, and 2s respectively."
    - Semantic VAD "uses a turn detection model (in conjunction with VAD)... if user audio trails off with 'uhhm', the model will score a low probability of turn end and wait longer".
  - Set `turn_detection` to `null` to turn it off.
  - [Client secrets reference](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create)
  - The VAD guide's example: `{"type":"server_vad","threshold":0.5,"prefix_padding_ms":300,"silence_duration_ms":500}` — [VAD guide](https://developers.openai.com/api/docs/guides/realtime-vad)
  - "Keep VAD, but disable automatic responses": set `interrupt_response` and `create_response` to `false`, then send `response.create` yourself. This is "useful for moderation or input validation". — [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations)
- **Noise reduction**
  - `noise_reduction: { type: "near_field" | "far_field", strength: 0–1 (default 1) }`. `near_field` is "for close-talking microphones such as headphones"; `far_field` is for "far-field microphones such as laptop or conference room microphones". Set it to `null` to turn it off.
  - It "filters audio... before it is sent to VAD and the model", which can reduce VAD false positives.
  - [Client secrets reference](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create)
- **Input transcription** (`audio.input.transcription`)
  - Off by default. It "runs asynchronously... and should be treated as guidance of input audio content rather than precisely what the model heard."
  - Models: `whisper-1`, `gpt-transcribe`, `gpt-live-transcribe`, `gpt-4o-mini-transcribe`, `gpt-4o-mini-transcribe-2025-12-15`, `gpt-4o-transcribe`, `gpt-4o-transcribe-diarize`, `gpt-realtime-whisper`.
  - Fields:
    - `language` (ISO-639-1)
    - `languages[]` (gpt-transcribe and gpt-live-transcribe)
    - `prompt` (free text for gpt-4o-transcribe models; not supported for gpt-realtime-whisper)
    - `keywords[]` (gpt-transcribe and gpt-live-transcribe)
    - `delay` (minimal…xhigh; the reference says this is "Only supported with `gpt-realtime-whisper` in GA Realtime sessions")
  - [Client secrets reference](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create)
  - Conflicting docs on `delay`: the Agents SDK guide says to "Use `gpt-live-transcribe` for low-latency streaming transcription; its `delay` setting trades faster partial transcripts against final transcript quality". Its example uses `transcription:{model:'gpt-live-transcribe', delay:'low', prompt, keywords, languages}` inside a RealtimeSession. This contradicts the reference's "only gpt-realtime-whisper" note on `delay`. — [Agents SDK build guide source](https://github.com/openai/openai-agents-js/blob/main/docs/src/content/docs/guides/voice-agents/build.mdx), [configureSession.ts](https://github.com/openai/openai-agents-js/blob/main/examples/docs/voice-agents/configureSession.ts)
  - OpenAI's Realtime transcription guide says "Start with `gpt-live-transcribe`" for live captions — [Realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription)
- **`max_output_tokens`**: "Maximum number of output tokens for a single assistant response, inclusive of tool calls. Provide an integer between 1 and 4096... or `inf`... Defaults to `inf`." — [Client secrets reference](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create)
- **Reasoning**
  - `reasoning: { effort: "minimal"|"low"|"medium"|"high"|"xhigh" }`, default `"low"`, "for reasoning-capable Realtime models such as `gpt-realtime-2`". — [Client secrets reference](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create)
  - The prompting guide's guidance:
    - "`minimal` | Lowest latency matters most and the task is simple."
    - "Start with `low` for most production voice agents."
    - `gpt-realtime-2` "generates preambles by default".
  - [Prompting Realtime models](https://developers.openai.com/api/docs/guides/realtime-models-prompting)
- **Tools**
  - Configure with `session.tools` (or per response with `response.tools`): `{"type":"function","name":...,"description":...,"parameters":{JSON Schema}}` and `"tool_choice":"auto"`. The example parameter uses an `enum`. — [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations)
  - The model emits `response.function_call_arguments.delta` and `.done`. The `.done` event has fields `arguments`, `call_id`, `item_id`, `name`, `output_index` and `response_id`, and is "Also emitted when a Response is interrupted, incomplete, or cancelled." — [Server events reference](https://developers.openai.com/api/reference/resources/realtime/server-events)
  - `response.done` contains an `output[]` item `{type:"function_call", name, call_id, arguments:"{...json...}"}`.
  - Reply with `{"type":"conversation.item.create","item":{"type":"function_call_output","call_id":"call_...","output":"{\"horoscope\": \"...\"}"}}`, then `{"type":"response.create"}`. — [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations)
  - Agents SDK tools: `tool({ name, description, parameters: z.object({...}), async execute(args) {...} })`, passed in `new RealtimeAgent({ tools: [...] })`. `backgroundResult(output)` returns tool output without triggering a response. — [defineTool.ts](https://github.com/openai/openai-agents-js/blob/main/examples/docs/voice-agents/defineTool.ts), [Agents SDK build guide source](https://github.com/openai/openai-agents-js/blob/main/docs/src/content/docs/guides/voice-agents/build.mdx)
- **No-op tool for silence and background audio**
  - The prompting guide recommends a `wait_for_user` tool: "Call this when the latest audio does not need a spoken response, such as silence, background noise, hold music, TV audio, side conversation, or speech not addressed to the assistant."
  - Paired instruction: "Do not say 'I'm here,' 'I didn't catch that,'..."
  - It also suggests an "Unclear Audio" block, for example "Do not guess what the user meant from unclear audio."
  - [Prompting Realtime models](https://developers.openai.com/api/docs/guides/realtime-models-prompting)
- **Mid-session changes**
  - Instructions can be changed with `session.update` (the sideband example sends `{type:"session.update", session:{type:"realtime", instructions:"Be extra nice today!"}}`) — [Server-side controls](https://developers.openai.com/api/docs/guides/realtime-server-controls)
  - But changing instructions or tools mid-session busts the prompt cache for later turns — [Realtime cost optimization](https://developers.openai.com/api/docs/guides/realtime-costs)
  - In the SDK, "`model` cannot change mid-conversation, `voice` can only change before the session has produced audio output". — [Agents SDK build guide source](https://github.com/openai/openai-agents-js/blob/main/docs/src/content/docs/guides/voice-agents/build.mdx)
- **Out-of-band responses**: `response.create` with `response.conversation:"none"`, plus `metadata` and optionally `input:[]`, runs a side task (for example classification) without touching the main conversation — [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations)

### Inferences
- **Profile lookup**
  - Deliver the profile as a `function_call_output`, not by rewriting `instructions` with `session.update`. Appending keeps the cached prefix intact; rewriting instructions busts the cache for the rest of the session.
  - If the household's enrolled names are known when the token is minted, put them in the tool's `enum`. The model can then only pick valid names, and your backend still fuzzy-matches.
- **Function-call gotcha:** because `response.function_call_arguments.done` also fires on cancelled responses, execute tools on it only if that response was not cancelled. Alternatively, read function calls from `response.done` where `status === "completed"`.
- **`max_output_tokens`:** a low cap cuts the audio off mid-word. Control length through instructions ("1–2 short sentences") and leave the cap at `inf` or something generous like 1024. Whether reasoning tokens count toward the cap is unverified.

### Gaps
- The docs give no "warmth" or character descriptions of the voices, so choosing one needs listening tests. Kids-specific voice guidance was not found.
- The `delay` support for `gpt-live-transcribe` inside conversation sessions is documented inconsistently (reference vs Agents SDK).
- Unverified whether `reasoning.effort` applies to `gpt-realtime-2.1-mini`. Its page says only "Reasoning token support".

---

## 5. Server events to drive the character UI (GA names, with beta renames)

### Takeaway
Use these GA events:
- `input_audio_buffer.speech_started` / `speech_stopped`: the child starts and stops talking.
- `response.created` / `response.done`: the model is thinking / the response is finished, with usage.
- `output_audio_buffer.started` / `stopped` / `cleared` (WebRTC/SIP only): the character starts talking, stops talking, or was interrupted.
- `response.output_audio_transcript.delta` / `.done`: the character's captions.
- `conversation.item.input_audio_transcription.delta` / `.completed` / `.failed`: the child's captions.

Beta names such as `response.audio.delta` and `response.audio_transcript.delta` were renamed to `response.output_audio.*` and `response.output_audio_transcript.*`. The beta interface was shut down on May 12, 2026.

### Cited Findings
- **`input_audio_buffer.speech_started`**: "The client may want to use this event to interrupt audio playback or provide visual feedback to the user." Its `item_id` "is the ID of the user message item that will be created when speech stops". — [Server events reference](https://developers.openai.com/api/reference/resources/realtime/server-events)
- **Output audio buffer events**
  - `output_audio_buffer.started`: "**WebRTC/SIP Only:** Emitted when the server begins streaming audio to the client... after an audio content part has been added". Example: `{"event_id":"event_abc123","type":"output_audio_buffer.started","response_id":"resp_abc123"}`.
  - `output_audio_buffer.stopped`: "Emitted when the output audio buffer has been completely drained on the server... after the full response data has been sent to the client (`response.done`)."
  - `output_audio_buffer.cleared`: emitted "in VAD mode when the user has interrupted (`input_audio_buffer.speech_started`), or when the client has emitted the `output_audio_buffer.clear` event".
  - [Server events reference](https://developers.openai.com/api/reference/resources/realtime/server-events)
- **Full server event list in the reference**:
  - Session: `error`, `session.created`, `session.updated`
  - Conversation items: `conversation.item.added`, `conversation.item.done`, `conversation.item.retrieved`, `conversation.item.truncated`, `conversation.item.deleted`
  - Input transcription: `conversation.item.input_audio_transcription.completed`, `.delta`, `.segment`, `.failed`
  - Input audio buffer: `input_audio_buffer.committed`, `.cleared`, `.speech_started`, `.speech_stopped`, `.timeout_triggered`, `.dtmf_event_received`
  - Output audio buffer: `output_audio_buffer.started`, `.stopped`, `.cleared`
  - Response: `response.created`, `response.done`, `response.output_item.added`, `response.output_item.done`, `response.content_part.added`, `response.content_part.done`, `response.output_text.delta` / `.done`, `response.output_audio.delta` / `.done`, `response.output_audio_transcript.delta` / `.done`, `response.function_call_arguments.delta` / `.done`
  - MCP: `response.mcp_call.*`, `mcp_list_tools.*`
  - Other: `rate_limits.updated`, plus legacy-looking `conversation.created` and `conversation.item.created`
  - [Server events reference](https://developers.openai.com/api/reference/resources/realtime/server-events)
- **Input transcription completed, example:** `{"type":"conversation.item.input_audio_transcription.completed","item_id":"item_...","content_index":0,"transcript":"Hey, can you hear me?","usage":{"type":"tokens","total_tokens":22,...}}` — [Server events reference](https://developers.openai.com/api/reference/resources/realtime/server-events)
- **Response end reasons**: a `cancelled` response has reason `turn_detected` or `client_cancelled`. An `incomplete` response has reason `max_output_tokens` or `content_filter` ("the server-side safety filter activated and cut off the response"). — [Server events reference](https://developers.openai.com/api/reference/resources/realtime/server-events)
- **History of the `output_audio_buffer.*` docs**: an OpenAI community thread says these events were dropped from the docs by mistake (not from the service), and that WebSocket connections never get `output_audio_buffer.stopped` — [OpenAI community thread, 2025](https://community.openai.com/t/how-to-determine-if-a-response-audio-has-finished-in-realtime-api-webrtc/1358787). They are documented again in the current reference (above).
- **Beta to GA renames**
  - OpenAI's migration note lists the new names `response.output_text.delta`, `response.output_audio.delta` and `response.output_audio_transcript.delta` — [Realtime getting started](https://developers.openai.com/api/docs/guides/realtime)
  - Third-party mapping:
    - `response.audio.delta` → `response.output_audio.delta`
    - `response.audio_transcript.delta` → `response.output_audio_transcript.delta`
    - content types `audio` → `output_audio` and `text` → `output_text`
    - [Microsoft Azure migration guide, secondary](https://learn.microsoft.com/en-au/Azure/foundry/openai/how-to/realtime-audio-preview-api-migration-guide)
  - The beta header shutdown date of May 12, 2026 is from [Deprecations](https://developers.openai.com/api/docs/deprecations).
- **Agents SDK `RealtimeSession` events**: `agent_start`, `agent_end`, `agent_handoff`, `agent_tool_start`, `agent_tool_end`, `transport_event` (the raw server events), `audio_start`, `audio_stopped`, `audio`, `audio_interrupted`, `guardrail_tripped`, `history_updated`, `history_added`, `error`, `tool_approval_requested`, `mcp_tool_call_completed`, `mcp_tools_changed` — [realtimeSessionEvents.ts](https://github.com/openai/openai-agents-js/blob/main/packages/agents-realtime/src/realtimeSessionEvents.ts)

### Inferences
- **Composed state machine for the character** (raw data channel; with the SDK, listen to `transport_event`):

  ```ts
  dc.addEventListener("message", (e) => {
    const ev = JSON.parse(e.data);
    switch (ev.type) {
      case "input_audio_buffer.speech_started": ui.set("listening"); maybeSnapshot(); break; // child talking
      case "input_audio_buffer.speech_stopped": ui.set("thinking"); break;
      case "response.created":                  ui.set("thinking"); break;
      case "output_audio_buffer.started":       ui.set("talking"); break;      // start lip-sync gate
      case "output_audio_buffer.stopped":       ui.set("idle"); break;
      case "output_audio_buffer.cleared":       ui.set("listening"); break;    // barge-in
      case "response.output_audio_transcript.delta": captions.bot(ev.response_id, ev.delta); guard.feed(ev); break;
      case "conversation.item.input_audio_transcription.delta":     captions.childPartial(ev.item_id, ev.delta); break;
      case "conversation.item.input_audio_transcription.completed": captions.child(ev.item_id, ev.transcript); break;
      case "response.done": telemetry.usage(ev.response.usage); handleToolCalls(ev.response); break;
      case "input_audio_buffer.timeout_triggered": /* server_vad idle re-engage fired */ break;
      case "error": console.error(ev.error); break;
    }
  });
  ```
- The child's transcript can arrive after the character has already started answering, because transcription is asynchronous. The UI should not wait for it.

### Gaps
- None material. The `conversation.item.created` vs `conversation.item.added`/`.done` distinction in GA was not fully checked; use `added`/`done`.

---

## 6. Guardrails: built-in moderation, moderating transcripts in real time, cancelling and truncating

### Takeaway
- **Built-in:** the Realtime API has a server-side safety filter that can end a response as `incomplete` with reason `content_filter`. It has no configurable moderation setting.
- **Your own layer:** stream the character's output transcript to your backend and check it with `omni-moderation-latest`, which is free and accepts text and images but not audio. The transcript usually arrives ahead of the audio, so there is time to act. With the Agents SDK, use `outputGuardrails`, which runs every 100 characters by default.
- **Stopping speech:** to cut the character off mid-sentence over WebRTC, send `response.cancel`, then `output_audio_buffer.clear`. The server then truncates the unplayed audio from the conversation.

### Cited Findings
- **Built-in filter**: `incomplete` with reason `content_filter` means "the server-side safety filter activated and cut off the response" — [Server events reference](https://developers.openai.com/api/reference/resources/realtime/server-events)
- **Moderation endpoint**
  - "The `omni-moderation-latest` model accepts text and image inputs. It doesn't classify audio. The moderation endpoint is free to use".
  - Child-safety note: "Never submit known child sexual abuse material (CSAM). Do not send suspected CSAM to `omni-moderation-latest`."
  - [Moderation guide](https://developers.openai.com/api/docs/guides/moderation)
  - Pricing lists omni-moderation-latest as Free — [Pricing](https://developers.openai.com/api/docs/pricing)
- **Agents SDK guardrails**
  - "Guardrails offer a way to monitor whether what the agent has said violated a set of rules and immediately cut off the response... In audio sessions, it uses output audio transcripts and transcript deltas".
  - "By default guardrails run every 100 characters and again when the final transcript is available. Because speaking the text usually takes longer than generating the transcript, this often lets the guardrail cut off unsafe output before the user hears it."
  - A tripped guardrail emits `guardrail_tripped` with `details.itemId`. `outputGuardrailSettings: { debounceTextLength }` sets the cadence; `-1` means run once at the end.
  - [Agents SDK build guide source](https://github.com/openai/openai-agents-js/blob/main/docs/src/content/docs/guides/voice-agents/build.mdx)
  - Verbatim guardrail shape: `{ name: 'No mention of Dom', async execute({ agentOutput }) { ... return { tripwireTriggered, outputInfo } } }`, passed as `new RealtimeSession(agent, { outputGuardrails: guardrails })` — [guardrails.ts](https://github.com/openai/openai-agents-js/blob/main/examples/docs/voice-agents/guardrails.ts)
- **Cancel and clear**
  - `response.cancel`: "The server will respond with a `response.done` event with a status of `response.status=cancelled`". It optionally takes `response_id`, for example `{"type":"response.cancel","response_id":"resp_12345"}`.
  - `output_audio_buffer.clear`: "**WebRTC/SIP Only:** Emit to cut off the current audio response... This event should be preceded by a `response.cancel` client event".
  - [Client events reference](https://developers.openai.com/api/reference/resources/realtime/client-events)
- **Truncation**
  - "In WebRTC and SIP connections the server manages a buffer of output audio... The server will automatically truncate unplayed audio when there's a user interruption."
  - The manual form is `{"type":"conversation.item.truncate","item_id":"item_1234","content_index":0,"audio_end_ms":1500}`. It removes the unplayed audio and its transcript text.
  - For WebRTC push-to-talk, the guide says to "send an `output_audio_buffer.clear` event... this truncates the conversation as well".
  - [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations)
- **Pre-checking input**: keep VAD but set `create_response:false` and `interrupt_response:false` so you can inspect input before triggering `response.create` — [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations)
- **OpenAI's guardrail pattern for GPT-Live** (it carries over by analogy):
  - "Run checks concurrently. A fast, lightweight model can evaluate requests while the conversation continues."
  - "corrective instructions cannot retract audio the caller has already heard".
  - Buffering audio until it is checked "adds latency".
  - [Server-side controls](https://developers.openai.com/api/docs/guides/realtime-server-controls)

### Inferences
- **Composed moderation guardrail (SDK) plus backend:**

  ```ts
  // browser
  const moderationGuardrail = {
    name: "omni-moderation",
    async execute({ agentOutput }: { agentOutput: string }) {
      const r = await fetch("/api/moderate", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: agentOutput }) });
      const { flagged } = await r.json();
      return { tripwireTriggered: flagged, outputInfo: { flagged } };
    },
  };
  // new RealtimeSession(agent, { outputGuardrails: [moderationGuardrail], outputGuardrailSettings: { debounceTextLength: 100 } })

  // server (openai@7.x)
  app.post("/api/moderate", async (req, res) => {
    const m = await openai.moderations.create({ model: "omni-moderation-latest", input: req.body.text });
    res.json({ flagged: m.results[0].flagged, categories: m.results[0].categories });
  });
  ```
- **Raw-API equivalent:** on a flag, send `{"type":"response.cancel"}` and then `{"type":"output_audio_buffer.clear"}`. Mute the `<audio>` element locally at once. Then send `response.create` with safe instructions, for example "Say: 'Oops, let's talk about something else! What's your favourite animal?'"
- **Also moderate the child's input transcripts.** This is for safeguarding signals (self-harm, abuse disclosures), and is a product and policy decision. Kids' content also needs an instruction-level safety policy in the prompt. The moderation categories are tuned for general harm, not age-appropriateness.
- **Expect false positives and gaps.** Child speech mis-transcriptions could trigger flags. Log every flag for review.

### Gaps
- I found no OpenAI documentation describing what the Realtime "server-side safety filter" covers, or any setting for it.
- I found no published latency figures for the moderation endpoint. Measure that a moderation round trip fits inside the window between the transcript arriving and the audio playing.

---

## 7. Data controls: is /v1/realtime eligible for Zero Data Retention?

### Takeaway
Yes. `/v1/realtime` is ZDR-eligible. By default its content is held 30 days for abuse monitoring, no application state is kept, and it is not used for training. ZDR and Modified Abuse Monitoring need prior approval from OpenAI's sales team.

### Cited Findings
- **Endpoint table**:
  - `/v1/realtime`: Data used for training **No**; abuse monitoring retention **30 days**; application state retention **None**; ZDR eligible **Yes**; Private Retention with PSP **No**.
  - `/v1/live/sessions`: ZDR "Yes, with limitations below"; application state "None, or 30 days if stored".
  - `/v1/audio/transcriptions`: abuse monitoring retention None, ZDR eligible Yes.
  - [Data controls](https://developers.openai.com/api/docs/guides/your-data)
- **Approval**: "these controls are subject to prior approval by OpenAI and acceptance of additional requirements... Get in touch with our sales team". They can be configured per organization or per project. — [Data controls](https://developers.openai.com/api/docs/guides/your-data)
- **CSAM scanning on image inputs**: "Images and files may be uploaded as inputs to `/v1/responses`..., `/v1/chat/completions`, and `/v1/images`... Image and file inputs are scanned for CSAM content upon submission... retained for manual review, even if Zero Data Retention... is enabled." `/v1/realtime` is not named in that sentence. — [Data controls](https://developers.openai.com/api/docs/guides/your-data)
- **Safety identifier**: recommended for Realtime, sent in the `OpenAI-Safety-Identifier` header using a hashed internal ID — [Realtime getting started](https://developers.openai.com/api/docs/guides/realtime)
- **Tracing**: session `tracing` writes traces to the Traces Dashboard. Set it to `null` to disable; "Once tracing is enabled for a session, the configuration cannot be modified." — [Client secrets reference](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create)

### Inferences
- For a children's product, apply for ZDR on the project. Leave `tracing` off (null) for child sessions. Use a hashed household ID as the safety identifier, and keep child PII (surnames, birthdates) out of instructions and tool outputs beyond what the conversation needs.
- Whether realtime image inputs get the same CSAM-scan retention exception is unclear. Treat webcam frames as potentially retained and minimize them: low resolution, only when needed.

### Gaps
- Whether realtime image inputs are CSAM-scanned and retained in the same way as Responses and Chat Completions images is not stated.
- COPPA and children's-data contract terms are outside these docs and were not researched here.

---

## 8. Children's speech: transcription accuracy and tips

### Takeaway
OpenAI publishes no child-speech accuracy figures for any current model (gpt-realtime-2.1, gpt-4o-transcribe, gpt-live-transcribe). Academic work shows off-the-shelf Whisper-class ASR does markedly worse on children: roughly 13–14% word error rate on the MyST child-speech dataset, against single digits for adults. So expect name recognition errors. Mitigations:
- Constrain the tool's name parameter with an `enum`.
- Pass the expected names to transcription as a `prompt` or `keywords`.
- Fuzzy-match names on the backend.
- Follow the prompting guide's "unclear audio" rules: ask again rather than guess.

### Cited Findings
- **Kid-Whisper (2023)**: fine-tuning Whisper on MyST cut WER "from 13.93% to 9.11%" (Small) and "from 13.23% to 8.61%" (Medium). This implies off-the-shelf Whisper sits around 13–14% WER on MyST child speech. — [Kid-Whisper, arXiv 2309.07927](https://arxiv.org/pdf/2309.07927)
- A small Conformer-Transducer "outperforms both [Whisper Tiny and Base] significantly on all three child audio evaluation sets" — [arXiv 2311.04936](https://arxiv.org/pdf/2311.04936)
- **[Secondary]** A review cites Whisper at about 3% WER for adults under ideal conditions, but about 80% for a German-accented child speaking English. Fine-tuning brought British children's WER from 74% to 3%. — [The Learning Agency](https://the-learning-agency.com/the-cutting-ed/article/how-speech-recognition-systems-struggle-with-childrens-voices/)
- **Input transcription is approximate**: it "should be treated as guidance of input audio content rather than precisely what the model heard. The client can optionally set the language and prompt" — [Client secrets reference](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create)
- **Biasing options**: a free-text `prompt` for gpt-4o-transcribe models ("expect words related to technology"), and `keywords` (gpt-transcribe and gpt-live-transcribe), which "are hints, not required output". The transcription guide's example is `"prompt": "A customer support call about a premium plan and account AC-42."` with `"languages": ["en","fr"]`. — [Client secrets reference](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create), [Realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription)
- **Model-side guidance**
  - `gpt-realtime-2.1` claims "better alphanumeric recognition, silence and noise handling" — [gpt-realtime-2.1](https://developers.openai.com/api/docs/models/gpt-realtime-2.1)
  - The prompting guide's Unclear Audio block includes: "If the user's audio is not clear, ask for clarification...", "Do not guess what the user meant from unclear audio.", and "Don't repeat the same unclear-audio clarification twice."
  - It also has entity-capture sections: "Collect one entity at a time", "Handle spelled-out characters", "Confirm exact identifiers before tool calls".
  - [Prompting Realtime models](https://developers.openai.com/api/docs/guides/realtime-models-prompting)

### Inferences
- **The lookup should not depend on the transcript.** The function-call argument comes from the speech model hearing the audio directly. Use an `enum` of the household's enrolled first names when it is known.
- **Backend fuzzy matching.** Match phonetically (for example Double Metaphone or Soundex, plus edit distance) against enrolled names. If the match is low-confidence, return `{"match":"ambiguous","candidates":["Maya","Mia"]}` so the character asks "Are you Maya or Mia?"
- **Transcription settings.** Set `prompt` to something like "A young child (4–8) talking to a cartoon friend; names: Maya, Aarav, ...". For `gpt-live-transcribe`, use `keywords:[names]`. Set `language:"en"` (or `languages`) if known.
- **Run your own eval.** Record consented child utterances (names, short answers, "look at my dinosaur"), then compare transcription models and 2.1 vs 2.1-mini on name capture.

### Gaps
- No WER data was found for gpt-4o-transcribe, gpt-4o-mini-transcribe, gpt-transcribe, gpt-live-transcribe or gpt-realtime-2.1 on child speech.
- No OpenAI guidance specific to children's voices was found.

---

## 9. On-device browser vision with MediaPipe Tasks Vision

### Takeaway
Use `@mediapipe/tasks-vision`. The latest stable is **1.2.3**; nightlies are 1.3.0-rc.
- **Face Landmarker** in `VIDEO` mode with `outputFaceBlendshapes:true` gives face presence plus 52 ARKit-style blendshapes. Smile = `mouthSmileLeft`/`mouthSmileRight`.
- **Face Detector** (BlazeFace short-range) is a cheaper presence check.
- **Gesture Recognizer** gives 8 classes, including Thumb_Up, Open_Palm and Victory.

OpenAI does not publish laptop frame rates. Google's own benchmarks are per-frame latencies on a Pixel 6 phone, in the 3–21 ms range for these tasks, which suggests real-time rates on a modern laptop.

### Cited Findings
- **Package versions**: npm `@mediapipe/tasks-vision` dist-tags `latest: 1.2.3` and `nightly: 1.3.0-rc.20261119` — [npm registry](https://www.npmjs.com/package/@mediapipe/tasks-vision)
- **Install and model URL**: `npm install @mediapipe/tasks-vision`. WASM from `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm`. Model: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task` — [Face Landmarker web guide](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js)
- **Example code from the guide** (summarized by the fetch tool):
  - `FilesetResolver.forVisionTasks(wasmUrl)`, then `FaceLandmarker.createFromOptions(vision, { baseOptions:{ modelAssetPath, delegate:"GPU" }, runningMode:"VIDEO", numFaces:1, outputFaceBlendshapes:true, outputFacialTransformationMatrixes:true })`.
  - A `requestAnimationFrame` loop calls `detectForVideo(video, performance.now())` only when `video.currentTime` has changed.
  - [Face Landmarker web guide](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js)
- **Options and defaults**:
  - `runningMode` IMAGE|VIDEO (default IMAGE); `numFaces` (default 1; "Temporal smoothing applies when set to 1")
  - `minFaceDetectionConfidence`, `minFacePresenceConfidence` and `minTrackingConfidence`, each default 0.5
  - `outputFaceBlendshapes` ("Outputs 52 blendshape scores") and `outputFacialTransformationMatrixes`, both default false
  - "`*Left` and `*Right` blendshapes describe the subject's face. Passing a horizontally mirrored image inverts them."
  - Input sizes: 128×128 (detection), 256×256 (landmarks), 1×146×2 (blendshapes)
  - [Face Landmarker web guide](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js)
- The Face Landmarker page describes "Track 478 3D facial mesh landmarks and 52 ARKit expression blend[shapes]". It was last updated 2026-11-19. — [Face Landmarker overview](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker)
- **Face Detector**: "Detect faces with bounding boxes and 6 facial keypoints". Pixel 6 benchmark for BlazeFace short-range: **CPU 2.94 ms, GPU 7.41 ms**. Models:
  - `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite`
  - full-range variants also exist
  - [Face Detector](https://developers.google.com/edge/mediapipe/solutions/vision/face_detector), [Face Detector web](https://developers.google.com/edge/mediapipe/solutions/vision/face_detector/web_js)
- **Gesture Recognizer**: "Classify 7 hand gestures alongside 21 3D landmarks". The canned classes are `["None", "Closed_Fist", "Open_Palm", "Pointing_Up", "Thumb_Down", "Thumb_Up", "Victory", "ILoveYou"]`. Pixel 6 benchmark: **CPU 16.76 ms, GPU 20.87 ms**. Model: `https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task` — [Gesture Recognizer](https://developers.google.com/edge/mediapipe/solutions/vision/gesture_recognizer)

### Inferences
- **Composed code** (pin versions rather than `@latest` so a nightly change cannot break you):

  ```ts
  import { FilesetResolver, FaceLandmarker, GestureRecognizer } from "@mediapipe/tasks-vision";
  const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm");
  const face = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task", delegate: "GPU" },
    runningMode: "VIDEO", numFaces: 1, outputFaceBlendshapes: true,
  });
  const gestures = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task", delegate: "GPU" },
    runningMode: "VIDEO", numHands: 1,
  });

  let lastT = -1, smiling = false, frame = 0;
  function loop() {
    if (video.readyState >= 2 && video.currentTime !== lastT) {
      lastT = video.currentTime;
      const now = performance.now();
      const r = face.detectForVideo(video, now);
      const present = r.faceLandmarks.length > 0;
      const cats = r.faceBlendshapes?.[0]?.categories ?? [];
      const s = (n: string) => cats.find(c => c.categoryName === n)?.score ?? 0;
      const smile = (s("mouthSmileLeft") + s("mouthSmileRight")) / 2;
      smiling = smiling ? smile > 0.35 : smile > 0.55;            // hysteresis
      if (++frame % 3 === 0) {                                       // gestures at ~1/3 rate
        const g = gestures.recognizeForVideo(video, now).gestures?.[0]?.[0];
        if (g && g.score > 0.7 && g.categoryName !== "None") reactions.gesture(g.categoryName);
      }
      reactions.update({ present, smiling });
    }
    requestAnimationFrame(loop);
  }
  loop();
  ```
- **Throttling:** run face detection at about 10–15 fps on battery and gestures less often. Reuse the same `getUserMedia` video stream for MediaPipe and the OpenAI snapshots.
- **Instant reactions** (character smiles back, waves when a face appears) should run entirely on-device. Optionally tell the model about them with short text items such as `{"type":"input_text","text":"[child is smiling]"}`, but only sparingly, without triggering a response.
- **Snapshot trigger:** on-device signals (a gesture, or a big frame-difference change) are good triggers for an OpenAI snapshot. This avoids sending images blindly every 3 s.
- `GestureRecognizer` option names (`numHands`, `recognizeForVideo`) come from the standard MediaPipe API. I did not re-verify them on the current page.

### Gaps
- No laptop or Chrome FPS benchmarks were found for Face Landmarker. Google's page showed none for it; there are Pixel 6 numbers for the face detector and gesture recognizer only.
- Blendshape names `mouthSmileLeft`/`mouthSmileRight` follow the ARKit naming that MediaPipe states it uses. The exact strings were not visible in the fetched page text; confirm them by logging `categories`.

---

## 10. Lip-sync from the remote WebRTC audio track (Web Audio AnalyserNode)

### Takeaway
Get the remote `MediaStream` from `pc.ontrack`, or pass your own `audioElement` to the SDK. Attach it to an `<audio>` element for playback, which is required anyway. Then feed the same stream to `AudioContext.createMediaStreamSource()` → `AnalyserNode`, and do not connect the analyser to `destination`.

The long-standing Chrome gotcha: Web Audio taps on a remote WebRTC stream output silence unless the stream is also attached to a media element (Chromium issue 933677). I could not verify whether that is fixed in current Chrome, so always keep the `<audio>` element attached. Use `output_audio_buffer.started`/`stopped` to gate the animation.

### Cited Findings
- **Playback setup**: the official WebRTC example plays model audio with `audioEl.autoplay = true; pc.ontrack = (e) => (audioEl.srcObject = e.streams[0]);` — [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations)
- **Agents SDK**: `OpenAIRealtimeWebRTC` accepts `audioElement?: HTMLAudioElement`. If none is supplied it creates `document.createElement('audio')` with `autoplay = true` and sets `srcObject = event.streams[0]`. — [openaiRealtimeWebRtc.ts](https://github.com/openai/openai-agents-js/blob/main/packages/agents-realtime/src/openaiRealtimeWebRtc.ts)
- **The Chrome workaround [old sources]**: "Chrome (as of version 58) still needs a HTML5 video/audio element, muted or not, as an endpoint for the remote WebRTC stream. Without that, a `MediaStreamAudioSourceNode` created by `createMediaStreamSource(stream)` will only emit silence." — [Stack Overflow mirror: audio level meter for WebRTC stream](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/36581380/audio-level-meter-for-web-rtc-stream)
- **The related Chromium issue**: Chromium issue 933677, "MediaStream from RTC is silent for Web Audio API". The poster found that monitoring worked only after also assigning `srcObject`. — [Stack Overflow mirror Q54514273](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/54514273/webrtc-via-web-audio-api-silent-on-google-chrome), [Babylon.js forum](https://forum.babylonjs.com/t/sound-created-with-a-remote-webrtc-stream-track-does-not-seem-to-work/7047)
- **Gating events**: `output_audio_buffer.started` and `.stopped` are WebRTC/SIP-only events marking when the server starts streaming audio and when the buffer has fully drained — [Server events reference](https://developers.openai.com/api/reference/resources/realtime/server-events)

### Inferences
- **Composed lip-sync:**

  ```ts
  let audioCtx: AudioContext | null = null;
  export function startLipSync(stream: MediaStream, setMouth: (open01: number) => void) {
    audioCtx ??= new AudioContext();            // create/resume inside the "Start" button click (autoplay policy)
    void audioCtx.resume();
    const src = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0.6;
    src.connect(analyser);                       // NOT to destination: the <audio> element already plays it
    const buf = new Float32Array(analyser.fftSize);
    let env = 0;
    (function tick() {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0; for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      env = Math.max(rms, env * 0.85);           // quick attack, slow release
      setMouth(Math.min(1, Math.max(0, (env - 0.01) * 10)));
      requestAnimationFrame(tick);
    })();
  }
  // pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; startLipSync(e.streams[0], character.setMouth); };
  ```
- **Viseme-style shapes:** for something richer than open/closed, map band energies to a few mouth shapes. Low-mid band energy approximates "O/A"; high band approximates "S/F". Driving this from the text transcript is unreliable because the transcript runs ahead of the audio.
- **Echo:** a laptop speaker playing the character can leak into the mic and trigger VAD barge-in. Keep `echoCancellation:true` in `getUserMedia` (Chrome's default), play through the WebRTC-attached `<audio>` element, and consider `noise_reduction:{type:"far_field"}`. This is general WebRTC practice and was not verified in an OpenAI doc.

### Gaps
- Whether Chromium issue 933677 (silent Web Audio from remote WebRTC streams) is fixed in current Chrome is unverified. The tracker page needed sign-in and the sources are 2017–2020. Keep the `<audio>` element attached regardless.
- No OpenAI-provided viseme or lip-sync data was found. The Realtime API does not emit visemes in any event I saw.

---

## 11. Design implications (recommended stack and config, with justification and cost)

### Takeaway
Build on the **Realtime API with `gpt-realtime-2.1-mini`**, keeping `gpt-realtime-2.1` as a switchable quality tier:
- **Connection:** WebRTC through the **Agents SDK `@openai/agents@0.22.x`**, with ephemeral client secrets minted by the Node backend, which holds the full session config.
- **Voice:** `marin`.
- **Turns:** `semantic_vad` with `eagerness:"low"`, which waits up to 8 s, for kids who pause. Add `far_field` noise reduction and a `wait_for_user` no-op tool.
- **Transcription:** `gpt-4o-mini-transcribe` with a names prompt, for captions and moderation.
- **Images:** about 512×384 JPEG at q≈0.7 and `detail:"low"`, sent when the child starts speaking and on on-device triggers. Cap at about 1 per 3–5 s, never trigger responses from images, and prune old frames.
- **On-device reactions:** MediaPipe 1.2.3.
- **Lip-sync:** AnalyserNode.
- **Moderation:** omni-moderation of transcripts through SDK output guardrails.

Estimated cost per 5-minute session: **about $0.13–0.17 on mini, or about $0.45–0.67 on 2.1** (see Section 1 for assumptions; the image token count is unverified).

### Cited Findings
- 2.1-mini takes image input, has a 128k context and function calling, and costs $10/$20 per 1M audio input/output tokens vs $32/$64 for 2.1 — [mini](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini), [2.1](https://developers.openai.com/api/docs/models/gpt-realtime-2.1)
- GPT-Live has no image input — [gpt-live-1.1](https://developers.openai.com/api/docs/models/gpt-live-1.1)
- Voice: "we recommend using `marin` or `cedar`", and the voice cannot change after the first audio — [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations)
- `semantic_vad` `low` "will wait longer for the user to continue speaking" (max 8 s). `idle_timeout_ms` works only with `server_vad`. — [Client secrets reference](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create)
- `far_field` is meant "for... laptop" mics — [Client secrets reference](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create)
- The `wait_for_user` no-op tool handles background audio and TV — [Prompting Realtime models](https://developers.openai.com/api/docs/guides/realtime-models-prompting)
- Reasoning effort: start with `low`, and use `minimal` when "Lowest latency matters most and the task is simple" — [Prompting Realtime models](https://developers.openai.com/api/docs/guides/realtime-models-prompting)
- Changing instructions or tools mid-session lowers the cache rate. The `retention_ratio` truncation setting reduces cache busting. — [Realtime cost optimization](https://developers.openai.com/api/docs/guides/realtime-costs)
- SDK output guardrails run every 100 characters, usually before the audio is heard — [Agents SDK build guide source](https://github.com/openai/openai-agents-js/blob/main/docs/src/content/docs/guides/voice-agents/build.mdx)
- `/v1/realtime` is ZDR-eligible with approval — [Data controls](https://developers.openai.com/api/docs/guides/your-data)

### Inferences
- **Recommended session config**, composed from documented fields and minted server-side:

  ```json
  {
    "expires_after": { "anchor": "created_at", "seconds": 600 },
    "session": {
      "type": "realtime",
      "model": "gpt-realtime-2.1-mini",
      "instructions": "<persona + kid-safety rules + 'reply in 1-2 short, simple sentences' + pacing ('speak slowly and warmly') + Unclear Audio block + how to react to images ('comment only on what the child is showing; never describe the child's body/appearance beyond friendly basics; never ask for address/school/last name')>",
      "output_modalities": ["audio"],
      "reasoning": { "effort": "low" },
      "audio": {
        "input": {
          "noise_reduction": { "type": "far_field" },
          "transcription": {
            "model": "gpt-4o-mini-transcribe",
            "language": "en",
            "prompt": "A young child (age 4-8) talking to a friendly cartoon character. Names you may hear: Maya, Aarav, Zoe."
          },
          "turn_detection": { "type": "semantic_vad", "eagerness": "low", "create_response": true, "interrupt_response": true }
        },
        "output": { "voice": "marin", "speed": 1.0 }
      },
      "tools": [
        { "type": "function", "name": "lookup_child_profile",
          "description": "Call once the child has said their first name, to load their saved profile (age, interests). Ask for their name first if unknown.",
          "parameters": { "type": "object",
            "properties": { "first_name": { "type": "string", "enum": ["Maya", "Aarav", "Zoe"], "description": "The child's first name as they said it." } },
            "required": ["first_name"] } },
        { "type": "function", "name": "wait_for_user",
          "description": "Call this when the latest audio does not need a spoken response, such as silence, background noise, TV audio, side conversation, or speech not addressed to you.",
          "parameters": { "type": "object", "properties": {}, "required": [] } }
      ],
      "tool_choice": "auto",
      "truncation": { "type": "retention_ratio", "retention_ratio": 0.8, "token_limits": { "post_instructions": 32000 } },
      "tracing": null
    }
  }
  ```
- **Why `semantic_vad` low and not `server_vad`.** Young children pause mid-sentence ("I have a... um... dinosaur"). Semantic VAD waits longer on trailing-off speech, up to 8 s at `low`.
  - If testing shows the character feels sluggish, try `medium` (4 s max). The other option is `server_vad` with `silence_duration_ms` 900–1200, `threshold` about 0.6 and `prefix_padding_ms` 300. That gives a fixed, predictable wait and allows `idle_timeout_ms` (for example 15000) to re-engage a quiet child automatically.
  - With semantic_vad, build the re-engagement timer client-side. After about 15 s of no speech following `output_audio_buffer.stopped`, send `response.create` with per-response instructions such as "gently invite the child to show you something".
- **Barge-in:** keep `interrupt_response:true`, because kids interrupt. Pair it with far-field noise reduction and the `wait_for_user` tool so TV or sibling noise does not derail the conversation.
- **Image cadence (cheapest with good perceived awareness):**
  1. On `input_audio_buffer.speech_started`, send one frame with `detail:"low"`. It lands in context just before the child's utterance item, so "look at this!" works with no extra round trip.
  2. Send extra frames only on on-device triggers (a MediaPipe gesture such as Open_Palm or Pointing_Up, a large frame-difference change, or a new face), rate-limited to 1 per 3–5 s.
  3. Use `detail:"high"` only when the child explicitly asks the character to look.
  4. Never send `response.create` (or SDK `triggerResponse:true`) for passive frames.
  5. Keep the last few images. Every ~20 frames, batch-delete older image items with `conversation.item.delete`, or rely on `retention_ratio` truncation. Batching limits how often the cache is busted.
  - This yields roughly 15–40 images per 5 minutes, vs 100 at a fixed 3 s cadence. That cuts image cost, context growth and stale-frame commentary.
- **Profile lookup flow.** The child says their name. The model calls `lookup_child_profile` (enum-constrained). The SDK `tool().execute` POSTs to the backend, which fuzzy-matches phonetically and returns a minimal JSON profile (first name, age band, 3 interests) as the tool output. The model greets them personally. Do not `session.update` the instructions with the profile, because that busts the cache.
- **Latency levers**
  - Model choice: mini, `reasoning.effort` `low` (try `minimal`), and short responses.
  - Connection: WebRTC, and the unified interface or WARP (DTLS 1.3 now, SNAP via the Chrome origin trial) for faster connect.
  - Keep tool round trips under about 300 ms, and keep instructions stable so cache hits stay high.
  - Pre-mint the ephemeral key on the start screen before the child taps "Start".
- **Safety stack:**
  1. Persona and safety rules in the instructions.
  2. OpenAI's built-in `content_filter`.
  3. SDK `outputGuardrails` calling the backend `omni-moderation-latest` every ~100 characters. On a trip: `interrupt()`, then a canned redirect.
  4. Input-transcript moderation and logging for safeguarding review.
  5. ZDR applied for, a hashed `OpenAI-Safety-Identifier`, and tracing off.
- **Cost per 5-minute session** (from Section 1, with T ≈ 250 tokens per image assumed):
  - mini with event-driven images ≈ **$0.12–0.15**
  - 2.1 with event-driven images ≈ **$0.40–0.50**
  - A fixed 3 s cadence adds about **$0.05 (mini)** or **$0.30 (2.1)**
  - Instrument `response.done.usage` from day one to replace these assumptions with measured numbers.

### Gaps
- The realtime per-image token count, the size of the latency gap between 2.1 and 2.1-mini, child-speech accuracy, Chrome's current `maxMessageSize`, and the status of the Chrome Web Audio remote-stream bug all need hands-on measurement before launch.
