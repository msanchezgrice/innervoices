export const DEFAULT_CONFIG = {
  // Timing
  watchInterval: 5000, // How often to check for changes (ms)
  commentInterval: 10000, // Minimum time between comments (ms)

  // Voice (browser TTS)
  voiceEnabled: true,
  voiceSpeed: 1.0, // 0.5 to 2.0
  voiceVolume: 0.3, // 0 to 1
  voicePitch: 1.0, // 0.5 to 2.0
  voiceName: "", // optional browser voice name; empty = auto-pick best

  // TTS Provider
  ttsProvider: "openai-realtime", // "openai-realtime" | "elevenlabs"
  openaiRealtimeModel: (import.meta.env.VITE_OPENAI_REALTIME_MODEL || "gpt-4o-realtime-preview"),
  openaiRealtimeVoice: (import.meta.env.VITE_OPENAI_REALTIME_VOICE || "alloy"),
  elevenlabsApiKey: (import.meta.env.VITE_ELEVENLABS_API_KEY || import.meta.env.ELEVEN_LABS_API_KEY || ""),
  elevenlabsVoiceId: "",
  elevenlabsVoiceName: "Michael C Vincent",

  // Realtime features
  enableRealtimeTools: true, // allow Realtime tool-calls (e.g., generate_image)
  realtimeMicEnabled: false, // capture mic and send upstream via WebRTC (opt-in)
  imageDefaultSize: "1024x1024", // default size for generated images

  // AI Provider & Models
  aiProvider: "openai-realtime", // "openai-realtime" | "openai" | "anthropic"
  openaiApiKey: (import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY || ""),
  anthropicApiKey: "",
  openaiModel: "gpt-5-mini",
  anthropicModel: "claude-3-5-sonnet-latest",

  // AI system prompt and verbosity
  systemPrompt:
    "You produce timely ambient commentary for a writer. Be helpful, warm, and constructive. Provide 2–4 concise sentences unless the user content strongly suggests otherwise.",
  maxTokens: 10000, // default output token limit
  allowToolCalling: true, // enable LLM tool-calling schema (future tools can hook in)

  // Ship Mode (encouraging, direct, action-focused)
  shipModeEnabled: true, // default ON
  shipModeIntensity: "encouraging", // gentle | encouraging | direct
  detectPatterns: true, // detect procrastination patterns
  trackCommitments: true, // remember user's stated commitments
  escalateOnInaction: true, // gently escalate tone if no action taken

  // AI Behavior
  commentProbability: 0.3, // 0-1, chance of commenting
  maxCommentLength: 200, // words (post-truncation safety)
  creativity: 0.7, // 0-1, AI temperature

  // Personality
  personality: "friend", // friend | coach | philosopher | comedian | custom
  personalityCustom: "", // used when personality === "custom"
  tone: "encouraging", // encouraging | neutral | challenging | playful | custom
  toneCustom: "", // used when tone === "custom"

  // UI
  showNotes: true, // show/hide notes sidebar
  debugLogging: false, // log prompts, responses, and state changes to console
  showTraceOverlay: true, // show thinking overlay pane
  orbPosition: null, // { x: number, y: number } pixels from top-left (null = default bottom-right)
  overlayPosition: null, // { x, y } position for the thinking overlay (null = default bottom-left)

  // Use Cases (toggleable)
  useCases: {
    productivity: true, // Comments on task management
    emotional: true, // Emotional support
    ideas: true, // Idea amplification
    patterns: true, // Pattern recognition
    accountability: false, // Deadline reminders
    celebration: true, // Celebrate wins
  },
};
