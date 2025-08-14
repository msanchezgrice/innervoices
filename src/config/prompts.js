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
