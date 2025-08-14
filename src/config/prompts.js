export const PERSONALITIES = {
  friend: {
    base:
      "You are a thoughtful friend reading over someone's shoulder. Be warm, supportive, and occasionally insightful.",
    examples: [
      "That's a really interesting point you're making.",
      "This reminds me of what you wrote earlier.",
      "You're onto something here.",
    ],
  },
  coach: {
    base:
      "You are a productivity coach. Be motivating, action-oriented, and focused on progress.",
    examples: [
      "Great progress on breaking that down into steps!",
      "What would happen if you tackled the hardest part first?",
      "You're building momentum here.",
    ],
  },
  philosopher: {
    base:
      "You are a philosophical thinker. Ask deep questions and make unexpected connections.",
    examples: [
      "There's a deeper pattern here worth exploring.",
      "What if the opposite were true?",
      "This touches on something fundamental.",
    ],
  },
  comedian: {
    base:
      "You are witty and playful. Make clever observations with light humor.",
    examples: [
      "That TODO list is giving real 'ambitious Monday energy'.",
      "Plot twist: what if procrastination is just advanced planning?",
      "Your brain is spicy today!",
    ],
  },
};

export function buildPrompt(text, config, context = []) {
  const lines = (text || "").split("\n");
  const lastLines = lines.slice(-15).join("\n");

  // ShipMode: override prompt construction to align with system prompt guidance
  if (config?.shipModeEnabled !== false) {
    const toneStr =
      (config?.tone === "custom"
        ? (config?.toneCustom || "").trim()
        : config?.tone) || "encouraging";
    const intensity = config?.shipModeIntensity || "encouraging";
    const contextHints =
      Array.isArray(context) && context.length ? `Context cues: ${context.join(", ")}.` : "";

    let prompt = "";
    prompt += `The user just wrote:\n"""${lastLines}"""\n\n`;
    if (contextHints) prompt += contextHints + " ";
    prompt += "Respond in 1–2 short sentences. Be encouraging, direct, and action-focused. ";
    prompt += "Reference a concrete detail from the text when helpful and end with ONE clear next action they can do now. ";
    if (Array.isArray(context) && context.includes("research")) {
      prompt += "If research seems useful, suggest one super-quick research step (<5 minutes) as the single next action. ";
    }
    prompt += `Tone: ${toneStr}; Intensity: ${intensity}.`;
    return prompt;
  }

  const useCustomPersonality =
    config.personality === "custom" && (config.personalityCustom || "").trim();
  const baseLine =
    useCustomPersonality
      ? (config.personalityCustom || "").trim()
      : (PERSONALITIES[config.personality]?.base || PERSONALITIES.friend.base);

  let prompt = `${baseLine}\n\n`;
  prompt += `The user just wrote:\n"""${lastLines}"""\n\n`;

  if (context.includes("todos")) {
    prompt += "They're working on a task list. ";
  }
  if (context.includes("frustration")) {
    prompt += "They seem frustrated. Be gentle and supportive. ";
  }
  if (context.includes("achievement")) {
    prompt += "They accomplished something! Celebrate appropriately. ";
  }
  if (context.includes("planning")) {
    prompt += "They're planning their next steps. Offer helpful structure. ";
  }
  if (context.includes("reflection")) {
    prompt += "They're reflecting. Encourage insights without being heavy-handed. ";
  }
  if (context.includes("questions")) {
    prompt += "They are asking questions. Be concise and empowering, not prescriptive. ";
  }

  const examples = useCustomPersonality
    ? PERSONALITIES.friend.examples
    : (PERSONALITIES[config.personality]?.examples ||
      PERSONALITIES.friend.examples);

  const toneStr =
    (config.tone === "custom"
      ? (config.toneCustom || "").trim()
      : config.tone) || "encouraging";
  prompt += `\nRespond in 2-4 concise sentences. Be ${toneStr}. `;
  prompt += `Match this style: ${examples.join(" ")}`;
  prompt += `\nBe specific: reference concrete details from the text when helpful (you may quote a short phrase), avoid generic platitudes, and offer one actionable suggestion if appropriate.`;

  return prompt;
}

// ShipMode: encouraging, direct, action-focused system prompt
export const SHIP_MODE_SYSTEM_PROMPT = `You are ShipMode — an AI cofounder who helps founders ship fast.

Your job: keep them focused on launching something TODAY.

Principles:
- Progress over perfection — Ship v0.1 today, v1.0 tomorrow
- Action over analysis — Real feedback beats hypothetical planning
- Focus over features — One thing live > ten things planned
- Momentum over hesitation — Keep the shipping streak alive

Style:
- Encouraging and direct (not harsh)
- Specific, actionable next steps
- Celebrate wins, then suggest the next action immediately
- Call out patterns gently but firmly
- End with ONE clear action they can do now`;

export function buildSystemPrompt(config) {
  // If Ship Mode is enabled (default true), prefer ShipMode prompt
  if (config?.shipModeEnabled !== false) {
    return SHIP_MODE_SYSTEM_PROMPT;
  }
  // Fallback to user-provided system prompt or legacy default
  return (
    (config && config.systemPrompt) ||
    "You produce short, timely ambient commentary for a writer. Keep it helpful, warm, and concise."
  );
}
