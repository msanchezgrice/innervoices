# InnerVoices

Ambient AI commentary that thinks alongside you while you write.

InnerVoices runs entirely in the browser. It watches your notes and provides short, timely, human‑sounding commentary through a draggable Orb UI with a “thinking” overlay you can toggle. The app is designed for minimal disruption: you write, it gently nudges.

Live preview is intended to be deployed to Vercel (static hosting). Users bring their own API keys or you may preconfigure keys via Vercel environment variables for private testing.

---

## Key Features

- Landing page (first visit)
  - Explains what InnerVoices is and the basic flow, with CTAs to start or view setup.
- Onboarding tutorial (FTUE)
  - 3 steps: Welcome → OpenAI API key + model → Orb explanation.
  - Saves OpenAI settings, then opens Settings.
- Notes workspace
  - Notion-like left sidebar (toggleable; Cmd/Ctrl+B).
  - Note title auto-syncs from first non-empty line (no rename button).
  - Editor is a single “Notepad” on the right.
  - When notes are collapsed, the editor gets left padding so the hamburger doesn’t overlap “Start writing…”.
- Orb (draggable)
  - Default dock: bottom-center (mobile-friendly).
  - States: idle, thinking, tooling, ready, speaking, muted, error.
  - Click: Start/Pause watcher. Alt+Click: Mute/Unmute.
  - Position persists across sessions.
- Thinking overlay (draggable)
  - Default dock: bottom-left.
  - Shows provider, model, System Prompt, Variables, Prompt, Response, Errors.
  - Position persists; can be hidden/toggled in Settings.
- Settings panel
  - Personality, tone, frequency, probability, creativity, comment length.
  - OpenAI-only model selection.
  - Voice settings:
    - OpenAI Realtime (default) or ElevenLabs (backup).
    - For ElevenLabs, voice can be selected; app also auto-resolves a preferred voice by name if a voice ID isn’t set.
  - Debug logging option (console).
- Ambient AI commentary
  - Background watcher periodically evaluates note content.
  - Emits commentary via OpenAI Realtime audio (default) or ElevenLabs fallback.
  - Tooling hooks exist for future tool-calls (context detection is available).
- Stability and UX
  - Hooks are stable (no early-return altering hook order).
  - Store subscriptions avoid infinite re-render loops.
  - Clearer Orb colors/rings and states.

---

## Tech Stack

- Vite + React
- Tailwind CSS
- Zustand (state)
  - `useConfigStore`: app configuration and trace
  - `useNotesStore`: note CRUD and selection
- OpenAI Realtime (WebRTC) for text+audio; OpenAI Responses API as fallback for text
- ElevenLabs TTS (backup/optional)
- No browser SpeechSynthesis fallback; removed

---

## Repo Structure

```
innervoices/
├── index.html
├── package.json
├── postcss.config.cjs / postcss.config.js
├── tailwind.config.js
├── vite.config.js            # Maps non-VITE_* envs to VITE_* for client (testing only)
└── src/
    ├── main.jsx              # React entrypoint
    ├── App.jsx               # App shell, overlays, panels, keyboard handlers
    ├── App.css / index.css
    ├── components/
    │   ├── Landing.jsx       # Concept 1 landing page (“Writer’s Companion”)
    │   ├── OnboardingModal.jsx # FTUE: Welcome → API setup → Orb guide
    │   ├── NotesSidebar.jsx  # Notion-like notes list (delete only, no rename)
    │   ├── Notepad.jsx       # Controlled textarea editor
    │   ├── Orb.jsx           # Draggable Orb (default bottom-center)
    │   ├── ThinkingOverlay.jsx # Draggable overlay (default bottom-left)
    │   └── Settings.jsx      # Settings; OpenAI-only
    ├── hooks/
    │   ├── useWatcher.js     # Schedules analysis, manages thinking/tooling states
    │   ├── useVoice.js       # Voice output via OpenAI Realtime (default) or ElevenLabs
    │   └── useRealtime.js    # Realtime session hook (WebRTC)
    ├── services/
    │   ├── ai.js             # OpenAI/Anthropic clients (Responses fallback)
    │   ├── realtime/
    │   │   └── client.js       # WebRTC Realtime client (browser)
    │   └── tts/
    │       ├── elevenlabs.js     # ElevenLabs speak (non-streaming)
    │       └── elevenlabsApi.js  # ElevenLabs voices listing
    ├── config/
    │   ├── defaults.js       # DEFAULT_CONFIG and UI defaults
    │   └── prompts.js        # System prompt builder
    ├── store/
    │   ├── useConfigStore.js # Zustand store for config & runtime trace
    │   └── useNotesStore.js  # Zustand store for notes
    └── utils/
        └── detectContext.js  # Simple context detection tooling
```

---

## Configuration & Environment Variables

Because this is a client-only app, keys that you expose via Vite (VITE_*) are embedded in the client bundle. This is acceptable for limited private testing; not recommended for public production. For production, proxy your LLM calls server-side.

### Preferred environment variable inputs (Vercel)

- OpenAI
  - `OPENAI_API_KEY` (server; required for Realtime and Images)
  - Optional client: `VITE_OPENAI_API_KEY` (for non-realtime testing)
  - Optional: `VITE_OPENAI_MODEL` (defaults to `gpt-5-mini`)
  - Optional Realtime: `VITE_OPENAI_REALTIME_MODEL` and `VITE_OPENAI_REALTIME_VOICE`
- ElevenLabs
  - `ELEVEN_LABS_API_KEY` or `VITE_ELEVENLABS_API_KEY`

vite.config.js maps non‑VITE variables to VITE at build time:
- `OPENAI_API_KEY` → `import.meta.env.VITE_OPENAI_API_KEY`
- `ELEVEN_LABS_API_KEY` → `import.meta.env.VITE_ELEVENLABS_API_KEY`
- `VITE_OPENAI_MODEL` defaults to `gpt-5-mini` if unset

### Runtime defaults (can be changed in Settings)

- Provider: OpenAI (UI is OpenAI‑only; Anthropic disabled due to browser CORS)
- Model: `gpt-5-mini` by default
- Max tokens: 25,000 (fallback defaults across services)
- TTS provider: OpenAI Realtime by default (ElevenLabs optional backup)
  - Preferred voice name: “Michael C Vincent”
  - On first TTS call, if a voice ID isn’t configured, the app lists your ElevenLabs voices and persists the ID of the matching name (case-insensitive).
- No browser SpeechSynthesis fallback

---

## Development

Prereqs: Node 18+

Install and run:

```bash
npm install
npm run dev
# Vite will start on an available port (5173+); open the Local URL
```

Keyboard shortcuts:
- Toggle Notes sidebar: Cmd/Ctrl + B

Debugging:
- In Settings, enable “Enable Debug Logging” to log prompts/responses and API request bodies (where applicable).

Reset FTUE/Landing during development:
- Re‑show landing: `localStorage.removeItem('iv_has_seen_landing')`
- Re‑run onboarding: `localStorage.removeItem('iv_onboarded')`

---

## Deployment (Vercel recommended)

1. Create a new Vercel Project and import this repo.
2. Project settings:
   - Framework: Vite
   - Root directory: `innervoices`
   - Build command: `vite build` (auto-detected)
   - Output directory: `dist` (auto-detected)
3. Environment Variables (for private testing):
   - `OPENAI_API_KEY` (or `VITE_OPENAI_API_KEY`)
   - `ELEVEN_LABS_API_KEY` (or `VITE_ELEVENLABS_API_KEY`)
   - Optional `VITE_OPENAI_MODEL` (default `gpt-5-mini`)
4. Deploy. Any changes to env vars require a redeploy to be baked into the bundle.

Security note: Client‑side embedding of secrets is fine for private testing; avoid for public release. For production, add a minimal API proxy (Edge Function) and keep provider keys server‑side.

---

## How It Works (High-Level)

- `useWatcher` (background analysis loop)
  - On interval, builds a prompt (`prompts.js`) and either sends via OpenAI Realtime (WebRTC) or falls back to the Responses client (`services/ai.js`).
  - Emits trace events to `useConfigStore` (thinking/tooling states; provider/model; prompt/response; errors).
  - Voice output uses OpenAI Realtime by default; ElevenLabs is available as backup.

- `services/ai.js` (AI clients)
  - OpenAI: Realtime (WebRTC) for text+audio; Responses API as a non-realtime fallback.
  - Anthropic: Implemented, but disabled in Settings due to CORS in browser; use a backend proxy to enable.

- `useVoice`
  - If `ttsProvider === "elevenlabs"` and API key is set:
    - Ensures a voiceId is known; if not, resolves it by name and persists.
    - Calls ElevenLabs TTS (non‑streaming) and plays audio in the browser.
  - Else: uses OpenAI Realtime audio (WebRTC remote track).

---

## Settings Overview

- Personality & Tone
  - Choose Friend/Coach/Philosopher/Comedian; tone Encouraging/Neutral/Challenging/Playful or custom.
- Prompt & Output
  - System Prompt (shown in the thinking overlay).
  - Max Tokens (default 25,000).
  - Enable Tool Calling (future tools use a shared schema).
- Frequency & Probability
  - `commentInterval` minimum spacing between comments.
  - `commentProbability` the likelihood to produce a comment on a check.
- Voice
  - Provider: OpenAI Realtime or ElevenLabs.
  - Voice speed, pitch, volume.
  - Test voice button.

---

## Known Limitations

- Client-only secrets
  - Keys are exposed in the client bundle. Use only for private testing, not broad public release.
- Anthropic in browser
  - Direct browser calls can hit CORS; use a server proxy if you wish to enable.
- Model nuances (OpenAI)
  - Some modern models require `max_completion_tokens` instead of `max_tokens`, and in some cases temperature must be omitted. The client adapts these automatically where possible.

---

## Roadmap Ideas

- Server proxy (Edge Functions) for keys & Anthropic support.
- Streaming responses & TTS.
- Tool calling UX and more tools (calendar/time/context fetchers).
- Collaboration and multi‑note AI awareness.
- Improved landing demo (embedded video/gif).
- Theming and shadcn/ui component extraction.

---

## License

MIT (or your preferred license).
