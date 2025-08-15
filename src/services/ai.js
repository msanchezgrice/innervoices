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
  
  // Always log critical info for debugging
  console.log("[OpenAI] Starting API call", {
    model,
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    allowToolCalling,
    timestamp: new Date().toISOString()
  });
  
  if (!apiKey) throw new Error("Missing OpenAI API key");
  if (!apiKey.trim()) throw new Error("OpenAI API key is empty");
  
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

  // Always log request details for debugging
  console.log("[OpenAI] Request body:", {
    ...body,
    instructions: body.instructions?.substring(0, 100) + "...",
    input: body.input?.substring(0, 100) + "..."
  });
  
  const url = "https://api.openai.com/v1/responses";
  console.log("[OpenAI] Calling:", url);
  
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "responses-api-v1"  // Required beta header for Responses API
      },
      body: JSON.stringify(body),
    });
  } catch (fetchError) {
    console.error("[OpenAI] Fetch error:", fetchError);
    throw new Error(`Network error calling OpenAI: ${fetchError.message}`);
  }
  
  console.log("[OpenAI] Response status:", res.status, res.statusText);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[OpenAI] API Error:", {
      status: res.status,
      statusText: res.statusText,
      response: text,
      timestamp: new Date().toISOString()
    });
    throw new Error(`OpenAI Responses error ${res.status}: ${text}`);
  }

  let data;
  try {
    data = await res.json();
    
    // Log the entire first output item to understand its structure
    if (data?.output && data.output.length > 0) {
      console.log("[OpenAI] First output item full content:", JSON.stringify(data.output[0]));
    }
    
    console.log("[OpenAI] Full response structure:", {
      hasOutput: !!data?.output,
      outputLength: data?.output?.length || 0,
      hasChoices: !!data?.choices,
      choicesLength: data?.choices?.length || 0,
      hasContent: !!data?.content,
      dataKeys: Object.keys(data || {}),
      firstOutputKeys: data?.output?.[0] ? Object.keys(data.output[0]) : [],
      firstOutputType: data?.output?.[0]?.type,
      firstOutputContent: data?.output?.[0]?.content,
      firstOutputText: data?.output?.[0]?.text,
      firstOutputMessage: data?.output?.[0]?.message
    });
    console.log("[OpenAI] Response data:", JSON.stringify(data).substring(0, 500));
  } catch (parseError) {
    console.error("[OpenAI] Failed to parse response:", parseError);
    throw new Error(`Failed to parse OpenAI response: ${parseError.message}`);
  }
  
  // Check for direct text field first (Responses API sometimes puts it here)
  if (data?.text && typeof data.text === 'string') {
    console.log("[OpenAI] Found text in direct data.text field");
    return data.text.trim();
  }
  
  // Handle tool calls if present
  const output = data?.output || [];
  const toolCalls = output.filter(item => item?.type === "function_call");
  
  if (toolCalls.length > 0) {
    console.log("[OpenAI] Tool calls detected:", toolCalls.length);
  }
  
  if (allowToolCalling && toolCalls.length > 0) {
    events?.onToolStart?.();
    
    try {
      const toolResults = [];
      for (const tc of toolCalls) {
        // For function_call type, the properties are directly on the object
        const name = tc?.name;
        let args = {};
        try {
          args = JSON.parse(tc?.arguments || "{}");
        } catch {}
        
        console.log("[OpenAI] Executing tool:", name, "with args:", args);
        const result = await executeBuiltinTool(name, args);
        
        toolResults.push({
          type: "function_result",
          call_id: tc.call_id,
          result: JSON.stringify(result),
        });
      }

      // Follow-up call with tool results - append to output
      const followBody = {
        model,
        instructions: system,
        input: prompt,  // Keep as plain string
        max_output_tokens: Math.min(Number(config?.maxTokens ?? 4096), 16384),
        output: [...output, ...toolResults],  // Append tool results to output
        tools: OPENAI_TOOLS,  // Keep tools available
        tool_choice: "none"  // Don't call more tools
      };

      console.log("[OpenAI] Making follow-up call with tool results");
      const followRes = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "responses-api-v1"
        },
        body: JSON.stringify(followBody),
      });
      console.log("[OpenAI] Follow-up response status:", followRes.status);

      if (!followRes.ok) {
        const text = await followRes.text().catch(() => "");
        throw new Error(`OpenAI follow-up error ${followRes.status}: ${text}`);
      }

      const followData = await followRes.json();
      console.log("[OpenAI] Follow-up response:", JSON.stringify(followData).substring(0, 500));
      
      // Check for direct text field first
      if (followData?.text && typeof followData.text === 'string') {
        console.log("[OpenAI] Found text in follow-up data.text field");
        return followData.text.trim();
      }
      
      return extractTextFromResponsesOutput(followData?.output || []);
    } finally {
      events?.onToolEnd?.();
    }
  }

  // Try extracting from output first, then fallback to full data
  let result = extractTextFromResponsesOutput(output);
  
  if (!result && data) {
    console.log("[OpenAI] No text in output, trying full data object");
    result = extractTextFromResponsesOutput(data);
  }
  
  console.log("[OpenAI] Extracted text:", result ? (result.substring(0, 100) + "...") : "EMPTY");
  return result;
}

/**
 * Extract text from Responses API output format
 */
function extractTextFromResponsesOutput(data) {
  console.log("[extractText] Attempting to extract from:", {
    isArray: Array.isArray(data),
    dataType: typeof data,
    hasLength: data?.length,
    firstItemKeys: data?.[0] ? Object.keys(data[0]) : 'N/A',
    firstItemType: data?.[0]?.type,
    firstItemContent: data?.[0]?.content ? (typeof data[0].content === 'string' ? data[0].content.substring(0, 50) : 'not a string') : 'no content'
  });
  
  // If data is the full response object, try to get output field
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    // Check for output field (Responses API)
    if (data.output) {
      return extractTextFromResponsesOutput(data.output);
    }
    
    // Check for choices field (Chat Completions fallback)
    if (data.choices && data.choices[0]?.message?.content) {
      console.log("[extractText] Found text in choices[0].message.content");
      return data.choices[0].message.content.trim();
    }
    
    // Check for direct content field
    if (data.content && typeof data.content === 'string') {
      console.log("[extractText] Found text in direct content field");
      return data.content.trim();
    }
    
    // Check for text field
    if (data.text && typeof data.text === 'string') {
      console.log("[extractText] Found text in direct text field");
      return data.text.trim();
    }
  }
  
  if (!Array.isArray(data)) {
    console.log("[extractText] Data is not an array, returning empty");
    return "";
  }
  
  for (const item of data) {
    // Check for direct text output (most common in Responses API)
    if (item?.type === "text" && typeof item?.text === "string") {
      console.log("[extractText] Found text in item with type='text'");
      return item.text.trim();
    }
    
    // Check for message with content array (conversational format)
    if (item?.type === "message" && Array.isArray(item?.content)) {
      const textPart = item.content.find(c => c?.type === "text" && typeof c?.text === "string");
      if (textPart?.text) {
        console.log("[extractText] Found text in message.content array");
        return textPart.text.trim();
      }
    }
    
    // Handle string output directly (some models may return this)
    if (typeof item === "string") {
      console.log("[extractText] Found direct string item");
      return item.trim();
    }
    
    // Check for content field in item
    if (item?.content && typeof item.content === "string") {
      console.log("[extractText] Found text in item.content");
      return item.content.trim();
    }
  }
  
  console.log("[extractText] No text found, returning empty");
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
  console.log("[analyzeText] Starting analysis", {
    textLength: text?.length || 0,
    hasResponseHistory: responseHistory?.length > 0,
    timestamp: new Date().toISOString()
  });
  
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
    
    // Always log for Vercel debugging
    console.log("[analyzeText] Calling AI provider", {
      provider,
      model,
      promptLength: prompt?.length || 0,
      systemPromptLength: system?.length || 0,
      allowTools: allowTools
    });
    
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
    
    console.log("[analyzeText] AI response received", {
      responseTime: ms,
      responseLength: raw?.length || 0,
      provider,
      model
    });

    const truncated = truncateWords(raw, Number(config?.maxCommentLength ?? 200));
    console.log("[analyzeText] Final output:", truncated?.substring(0, 100) + "...");
    return truncated;
  } catch (err) {
    events?.onApiEnd?.({ provider, model, ms: 0, ok: false, error: err?.message || String(err) });
    
    // Always log errors for debugging
    console.error("[analyzeText] AI Error", {
      provider,
      model,
      error: err?.message || String(err),
      stack: err?.stack,
      timestamp: new Date().toISOString()
    });
    
    const examples = [
      "That's a really interesting point you're making.",
      "You're onto something here.",
      "Nice momentum—keep going.",
      "That structure is getting clearer.",
    ];
    const pick = examples[Math.floor(Math.random() * examples.length)];
    console.log("[analyzeText] Using fallback response:", pick);
    return pick;
  }
}
