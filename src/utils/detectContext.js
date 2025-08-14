export function detectContext(text) {
  const contexts = {
    todos: /(^|\n)\s*(-|\*|\d+\.)\s+\[?\s?\]?.+/gm,
    questions: /\?.+/g,
    frustration: /(frustrated|stuck|confused|annoying|hate|ugh)/gi,
    achievement: /(finished|completed|done|shipped|launched|solved)/gi,
    planning: /\b(will|going to|plan to|need to|should)\b/gi,
    reflection: /\b(realized|learned|understood|think|feel)\b/gi,
  };

  const detected = [];
  const sample = (text || "").slice(-2000); // limit work on last ~2k chars
  for (const [context, regex] of Object.entries(contexts)) {
    if (regex.test(sample)) detected.push(context);
  }
  return detected;
}
