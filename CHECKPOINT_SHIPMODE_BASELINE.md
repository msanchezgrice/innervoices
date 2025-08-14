# ShipMode Baseline Checkpoint

This checkpoint captures the baseline of the new ShipMode (encouraging, direct, action-focused) implementation. Use this tag/commit to revert quickly if needed.

## Scope of Changes in This Baseline

Core behavior:
- ShipMode system prompt and prompt builder override for concise, action-focused replies
- Encouraging, no‑nonsense tone; not brutal
- Future-proofing for background research/tool-calling (scaffold only)

Files changed/added:
- src/config/prompts.js
  - Added SHIP_MODE_SYSTEM_PROMPT and buildSystemPrompt(config)
  - ShipMode-specific prompt building in buildPrompt when enabled
- src/utils/detectContext.js
  - Added ShipMode-focused cues: overthinking, feature_creep, competitors, research, excuses
- src/config/defaults.js
  - Added ShipMode config keys:
    - shipModeEnabled (default true)
    - shipModeIntensity ("gentle" | "encouraging" | "direct", default "encouraging")
    - detectPatterns, trackCommitments, escalateOnInaction
- src/components/Settings.jsx
  - New “Ship Mode” section with toggles and intensity selector
- src/services/ai.js
  - System prompt now resolved via buildSystemPrompt(config) (prefers ShipMode)
- src/services/backgroundResearch.js (new)
  - Lightweight scaffold to detect research triggers and suggest quick actions (no network calls yet)

Related behaviors maintained:
- Max tokens default 10,000 and max comment length 200 (previous change)
- Auto-create first note and autofocus (previous change)
- Dark mode based on system preference (previous change)

## How to Revert to This Baseline

To switch the working tree to this baseline tag (read-only “detached” mode):
```bash
git fetch --tags
git checkout shipmode-baseline
```

To reset your current branch (e.g. main) to this baseline (destructive: replaces local changes):
```bash
# Make sure you intend to overwrite local changes!
git fetch --tags
git reset --hard shipmode-baseline
git push --force-with-lease
```

To create a new branch from the baseline:
```bash
git fetch --tags
git checkout -b experiment-from-baseline shipmode-baseline
```

## Notes

- Background research is scaffolded only; when we enable tool calling (web/API), we’ll plug into src/services/backgroundResearch.js.
- Analytics are intentionally not included per current scope.
- Whiteboard/tldraw integration is explicitly out of scope for this baseline per product direction.
