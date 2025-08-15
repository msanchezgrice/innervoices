import { buildPrompt, buildSystemPrompt } from "../config/prompts";
import { detectContext } from "../utils/detectContext";

// Env fallbacks
const ENV_OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const ENV_OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || "gpt-4o-mini";

// Utilities
function truncateWords(text, maxWords) {
  if (!maxWords) return text;
  const words = (text || "").trim().split(/\s+/);
  if (words.length <= maxWords) return (text || "").trim();
  return words.slice(0, maxWords).join(" ") + "…";
}

function getSystemPrompt(config) {
  // Prefer ShipMode system prompt when enabled; falls back internally if disabled
  return buildSystemPrompt(config);
}

function getOpenAIConfig(config = {}) {
  return {
    apiKey: config.openaiApiKey || ENV_OPENAI_API_KEY,
    model: config.openaiModel || ENV_OPENAI_MODEL,
  };
}

function getAnthropicConfig(config = {}) {
  return {
    apiKey: config.anthropicApiKey || "",
    // Prefer Claude Sonnet 4 snapshot by default if none selected
    model: config.anthropicModel || "claude-sonnet-4-20250514",
  };
}

// Tool definitions for OpenAI Responses API
const OPENAI_TOOLS = [
  {
    type: "function",
    name: "detect_context",
    description: "Detect writing context cues in the user's text.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Full user text." },
      },
      required: ["text"],
    },
  },
  {
    type: "function",
    name: "get_time",
    description: "Returns current local time as ISO string.",
    parameters: { type: "object", properties: {} },
  },
];

const ANTHROPIC_TOOLS = [
  {
    name: "detect_context",
    description: "Detect writing context cues in the user's text.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Full user text." },
      },
      required: ["text"],
    },
  },
  {
    name: "get_time",
    description: "Returns current local time as ISO string.",
    input_schema: { type: "object", properties: {} },
  },
];

async function executeBuiltinTool(name, args) {
  try {
    if (name === "detect_context") {
      const res = detectContext(String(args?.text || ""));
      return { result: res, ok: true };
    }
    if (name === "get_time") {
      return { result: new Date().toISOString(), ok: true };
    }
    return { error: `Unknown tool: ${name}`, ok: false };
  } catch (e) {
    return { error: e?.message || String(e), ok: false };
  }
}

/**
 * OpenAI Responses API call
 */
async function callOpenAIResponses(prompt, config, { allowToolCalling = false } = {}, events) {
  const { apiKey, model } = getOpenAIConfig(config);
  if (!apiKey) throw new Error("Missing OpenAI API key");
  if (!apiKey.trim()) throw new Error("OpenAI API key is empty");
  if (config?.debugLogging) {
    console.debug("[InnerVoices][AI][OpenAI] API Key length:", apiKey.length);
    console.debug("[InnerVoices][AI][OpenAI] API Key starts with:", apiKey.substring(0, 7));
  }
  const system = getSystemPrompt(config);

  // Use Responses API
  const body = {
    model,
    instructions: system,
    input: prompt,  // Keep as plain string - API doesn't accept array format yet
    // Ensure max_output_tokens is reasonable for all models
    max_output_tokens: Math.min(Number(config?.maxTokens ?? 4096), 16384),
    ...(allowToolCalling ? { 
      tools: OPENAI_TOOLS,
      tool_choice: "auto"  // Allow model to decide when to use tools
    } : {}),
  };

  if (config?.debugLogging) {
    try { console.debug("[InnerVoices][AI][OpenAI][Responses] Body:", body); } catch {}
  }
  
  let res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "responses-api-v1"  // Required beta header for Responses API
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (config?.debugLogging) {
      console.error("[InnerVoices][AI][OpenAI][Responses] HTTP", res.status, "error:", text);
    }
    throw new Error(`OpenAI Responses error ${res.status}: ${text}`);
  }

  const data = await res.json();
  
  // Handle tool calls if present
  const output = data?.output || [];
  const toolCalls = output.filter(item => item?.type === "function");
  
  if (allowToolCalling && toolCalls.length > 0) {
    events?.onToolStart?.();
    
    try {
      const toolResults = [];
      for (const tc of toolCalls) {
        const name = tc?.function?.name;
        let args = {};
        try {
          args = JSON.parse(tc?.function?.arguments || "{}");
        } catch {}
        const result = await executeBuiltinTool(name, args);
        toolResults.push({
          type: "function",
          function: {
            name,
            // Pass result as raw object/value for better model parsing
            result: result.ok ? result.result : result.error,
          },
          id: tc.id,
        });
      }

      // Follow-up call with tool results
      const followBody = {
        model,
        instructions: system,
        input: prompt,  // Keep as plain string
        max_output_tokens: Math.min(Number(config?.maxTokens ?? 4096), 16384),
        context: {
          previous_output: output,
          tool_results: toolResults,
        },
      };

      const followRes = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "responses-api-v1"
        },
        body: JSON.stringify(followBody),
      });

      if (!followRes.ok) {
        const text = await followRes.text().catch(() => "");
        throw new Error(`OpenAI follow-up error ${followRes.status}: ${text}`);
      }

      const followData = await followRes.json();
      return extractTextFromResponsesOutput(followData?.output || []);
    } finally {
      events?.onToolEnd?.();
    }
  }

  return extractTextFromResponsesOutput(output);
}

/**
 * Extract text from Responses API output format
 */
function extractTextFromResponsesOutput(output) {
  if (!Array.isArray(output)) return "";
  
  for (const item of output) {
    // Check for direct text output (most common in Responses API)
    if (item?.type === "text" && typeof item?.text === "string") {
      return item.text.trim();
    }
    
    // Check for message with content array (conversational format)
    if (item?.type === "message" && Array.isArray(item?.content)) {
      const textPart = item.content.find(c => c?.type === "text" && typeof c?.text === "string");
      if (textPart?.text) {
        return textPart.text.trim();
      }
    }
    
    // Handle string output directly (some models may return this)
    if (typeof item === "string") {
      return item.trim();
    }
  }
  
  return "";
}


// Anthropic chat with optional tool calling
async function callAnthropicChat(prompt, config, { allowToolCalling = false } = {}, events) {
  const { apiKey, model } = getAnthropicConfig(config);
  if (!apiKey) throw new Error("Missing Anthropic API key");
  const system = getSystemPrompt(config);

  // Initial request
  const initPayload = {
    model,
    system,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: prompt }],
      },
    ],
    max_tokens: Number(config?.maxTokens ?? 10000),
    temperature: Number(config?.creativity ?? 0.7),
    ...(allowToolCalling ? { tools: ANTHROPIC_TOOLS } : {}),
  };

  let res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(initPayload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data?.content || [];
  const toolUses = content.filter((c) => c.type === "tool_use");

  if (allowToolCalling && toolUses.length > 0) {
    events?.onToolStart?.();

    try {
      const toolResults = [];
      for (const tu of toolUses) {
        const name = tu.name;
        const input = tu.input || {};
        const result = await executeBuiltinTool(name, input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: JSON.stringify(result),
        });
      }

      // Follow-up with tool results
      const followPayload = {
        model,
        system,
        messages: [
          { role: "user", content: [{ type: "text", text: prompt }] },
          { role: "assistant", content },
          { role: "user", content: toolResults },
        ],
        max_tokens: Number(config?.maxTokens ?? 10000),
        temperature: Number(config?.creativity ?? 0.7),
        ...(allowToolCalling ? { tools: ANTHROPIC_TOOLS } : {}),
      };

      const followRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify(followPayload),
      });

      if (!followRes.ok) {
        const text = await followRes.text().catch(() => "");
        throw new Error(`Anthropic follow-up error ${followRes.status}: ${text}`);
      }

      const followData = await followRes.json();
      const textPart = (followData?.content || []).find((c) => c.type === "text");
      return textPart?.text?.trim() || "";
    } finally {
      events?.onToolEnd?.();
    }
  }

  const textPart = content.find((c) => c.type === "text");
  return textPart?.text?.trim() || "";
}

/**
 * High-level analysis function: builds prompt, calls provider, truncates to config limits.
 * Returns a commentary string.
 *
 * analyzeText(text, config, events?)
 * events?: { onToolStart?: () => void, onToolEnd?: () => void }
 */
export async function analyzeText(text, config = {}, events, responseHistory = []) {
  const context = detectContext(text);
  const prompt = buildPrompt(text, config, context, responseHistory);

  // Derive resolved system prompt and meta for tracing
  const system = getSystemPrompt(config);
  const useCustomPersonality =
    config?.personality === "custom" && (config?.personalityCustom || "").trim();
  const resolvedPersonality = useCustomPersonality
    ? (config?.personalityCustom || "").trim()
    : (config?.personality || "friend");
  const resolvedTone =
    (config?.tone === "custom"
      ? (config?.toneCustom || "").trim()
      : config?.tone) || "encouraging";

  const meta = {
    personality: resolvedPersonality,
    tone: resolvedTone,
    creativity: Number(config?.creativity ?? 0.7),
    maxTokens: Number(config?.maxTokens ?? 10000),
    commentInterval: Number(config?.commentInterval ?? 10000),
    commentProbability: Number(config?.commentProbability ?? 0.3),
  };

  // Emit to traces
  events?.onSystemPrompt?.(system);
  events?.onMeta?.(meta);

  const provider = (config?.aiProvider || "openai").toLowerCase();
  const allowTools = Boolean(config?.allowToolCalling);
  const model =
    provider === "anthropic"
      ? getAnthropicConfig(config).model
      : getOpenAIConfig(config).model;

  try {
    // Logging + events: prompt and API start
    events?.onPrompt?.(prompt);
    events?.onApiStart?.({ provider, model, promptLength: prompt?.length ?? 0 });
    if (config?.debugLogging) {
      console.debug("[InnerVoices][AI] Calling provider:", provider, "model:", model);
      console.debug("[InnerVoices][AI] System Prompt:", system);
      console.debug("[InnerVoices][AI] Prompt:", prompt);
      console.debug("[InnerVoices][AI] Meta:", meta);
    }
    const t0 = Date.now();

    const raw =
      provider === "anthropic"
        ? await callAnthropicChat(
            prompt,
            config,
            { allowToolCalling: allowTools },
            events
          )
        : await callOpenAIResponses(
            prompt,
            config,
            { allowToolCalling: allowTools },
            events
          );

    const ms = Date.now() - t0;
    events?.onApiEnd?.({ provider, model, ms, ok: true });
    events?.onResponse?.(raw);
    if (config?.debugLogging) {
      console.debug("[InnerVoices][AI] Response in", ms + "ms:", raw);
    }

    return truncateWords(raw, Number(config?.maxCommentLength ?? 200));
  } catch (err) {
    events?.onApiEnd?.({ provider, model, ms: 0, ok: false, error: err?.message || String(err) });
    if (config?.debugLogging) {
      console.error("[InnerVoices][AI] Error:", err);
    } else {
      console.warn("[InnerVoices] AI fallback due to error:", err?.message || err);
    }
    const examples = [
      "That's a really interesting point you're making.",
      "You're onto something here.",
      "Nice momentum—keep going.",
      "That structure is getting clearer.",
    ];
    const pick = examples[Math.floor(Math.random() * examples.length)];
    return pick;
  }
}
