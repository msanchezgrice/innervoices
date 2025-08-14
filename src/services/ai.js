import { buildPrompt } from "../config/prompts";
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
  return (
    config?.systemPrompt ||
    "You produce short, timely ambient commentary for a writer. Keep it helpful, warm, and concise."
  );
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

// Tool definitions (shared semantics for both providers)
const OPENAI_TOOLS = [
  {
    type: "function",
    function: {
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
  },
  {
    type: "function",
    function: {
      name: "get_time",
      description: "Returns current local time as ISO string.",
      parameters: { type: "object", properties: {} },
    },
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
 * OpenAI Responses API call (prefers new Responses API; falls back to Chat Completions on failure)
 */
async function callOpenAIResponses(prompt, config, { allowToolCalling = false } = {}, events) {
  const { apiKey, model } = getOpenAIConfig(config);
  if (!apiKey) throw new Error("Missing OpenAI API key");
  const system = getSystemPrompt(config);

  const allowTempR =
    !(model?.startsWith("gpt-5") || model?.startsWith("gpt-4.1"));

  const body = {
    model,
    // Responses API: put system in 'instructions' and user content in 'input'
    instructions: system,
    input: prompt,
    ...(allowTempR ? { temperature: Number(config?.creativity ?? 0.7) } : {}),
    // Responses API uses max_output_tokens
    max_output_tokens: Number(config?.maxTokens ?? 300),
    ...(allowToolCalling ? { tools: OPENAI_TOOLS } : {}),
  };

  if (config?.debugLogging) {
    try { console.debug("[InnerVoices][AI][OpenAI][Responses] Body:", body); } catch {}
  }
  let res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
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

  // Convenience: some SDKs include `output_text`; also parse messages if present
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const getTextFromOutput = (out) => {
    if (!Array.isArray(out)) return "";
    for (const item of out) {
      // { type: 'message', content: [{type:'text', text:'...'}] }
      const contentArr = item?.content;
      if (Array.isArray(contentArr)) {
        const textPart = contentArr.find((c) => c?.type === "text" && typeof c?.text === "string");
        if (textPart?.text?.trim()) return textPart.text.trim();
      }
      // { type: 'output_text', text: '...' }
      if (item?.type === "output_text" && typeof item?.text === "string" && item.text.trim()) {
        return item.text.trim();
      }
    }
    return "";
  };

  const text = getTextFromOutput(data?.output || []);
  return (text || "").trim();
}

// OpenAI chat with optional tool calling
async function callOpenAIChat(prompt, config, { allowToolCalling = false } = {}, events) {
  const { apiKey, model } = getOpenAIConfig(config);
  if (!apiKey) throw new Error("Missing OpenAI API key");
  const system = getSystemPrompt(config);

  const baseMessages = [
    { role: "system", content: system },
    { role: "user", content: prompt },
  ];

  // Initial request
  const tokenParam =
    model?.startsWith("gpt-5") || model?.startsWith("gpt-4.1")
      ? "max_completion_tokens"
      : "max_tokens";

  const allowTemp =
    !(model?.startsWith("gpt-5") || model?.startsWith("gpt-4.1"));

  const initBody = {
    model,
    messages: baseMessages,
    ...(allowTemp ? { temperature: Number(config?.creativity ?? 0.7) } : {}),
    [tokenParam]: Number(config?.maxTokens ?? 300),
    ...(allowToolCalling ? { tools: OPENAI_TOOLS } : {}),
  };

  if (config?.debugLogging) {
    try { console.debug("[InnerVoices][AI][OpenAI][Chat] Init body:", initBody); } catch {}
  }
  let res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(initBody),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  const toolCalls = msg?.tool_calls;

  // Handle tool calling if requested
  if (allowToolCalling && Array.isArray(toolCalls) && toolCalls.length > 0) {
    events?.onToolStart?.();

    try {
      const toolResults = [];
      for (const tc of toolCalls) {
        const name = tc?.function?.name || tc?.name;
        let args = {};
        try {
          args = JSON.parse(tc?.function?.arguments || "{}");
        } catch {}
        const result = await executeBuiltinTool(name, args);
        toolResults.push({
          role: "tool",
          tool_call_id: tc.id,
          name,
          content: JSON.stringify(result),
        });
      }

      // Follow-up message with tool outputs
      const messages = [...baseMessages, msg, ...toolResults];

      const followBody = {
        model,
        messages,
        ...(allowTemp ? { temperature: Number(config?.creativity ?? 0.7) } : {}),
        [tokenParam]: Number(config?.maxTokens ?? 300),
      };
      if (config?.debugLogging) {
        try { console.debug("[InnerVoices][AI][OpenAI][Chat] Follow-up body:", followBody); } catch {}
      }
      const followRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(followBody),
      });

      if (!followRes.ok) {
        const text = await followRes.text().catch(() => "");
        throw new Error(`OpenAI follow-up error ${followRes.status}: ${text}`);
      }

      const followData = await followRes.json();
      const text =
        followData.choices?.[0]?.message?.content?.trim() ||
        data.choices?.[0]?.message?.content?.trim() ||
        "";
      return text;
    } finally {
      events?.onToolEnd?.();
    }
  }

  return msg?.content?.trim() || "";
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
    max_tokens: Number(config?.maxTokens ?? 300),
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
        max_tokens: Number(config?.maxTokens ?? 300),
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
export async function analyzeText(text, config = {}, events) {
  const context = detectContext(text);
  const prompt = buildPrompt(text, config, context);

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
    maxTokens: Number(config?.maxTokens ?? 300),
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
        : await callOpenAIChat(
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

    return truncateWords(raw, Number(config?.maxCommentLength ?? 50));
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
