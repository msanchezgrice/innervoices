export function detectContext(text) {
  const contexts = {
    // Existing contexts
    todos: /(^|\n)\s*(-|\*|\d+\.)\s+\[?\s?\]?.+/gm,
    questions: /\?.+/g,
    frustration: /(frustrated|stuck|confused|annoying|hate|ugh)/gi,
    achievement: /(finished|completed|done|shipped|launched|solved)/gi,
    planning: /\b(will|going to|plan to|need to|should)\b/gi,
    reflection: /\b(realized|learned|understood|think|feel)\b/gi,

    // ShipMode-focused contexts
    overthinking: /\b(should|maybe|considering|might|perhaps|possibly|thinking about)\b/gi,
    feature_creep: /(another feature|also add|what if we|nice to have|it would be cool|add(ing)?\s+(another|more))/gi,
    competitors: /\b(competitor|they have|market leader|others are|everyone else)\b/gi,
    research: /\b(research|analy[sz]e|study|investigate|explore|look into)\b/gi,
    excuses: /\b(but|however|can['’]?t|cant|won['’]?t|wont|unable|impossible|too hard)\b/gi,
  };

  const detected = [];
  const sample = (text || "").slice(-2000); // limit work on last ~2k chars
  for (const [context, regex] of Object.entries(contexts)) {
    if (regex.test(sample)) detected.push(context);
  }
  return detected;
}
