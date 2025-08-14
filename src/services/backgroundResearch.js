// Lightweight background research scaffolding (no network calls yet).
// This is designed so we can later plug in web/API fetches without changing callers.

const TRIGGERS = {
  competitor: /\b(competitor|alternative|versus|vs|compare|comparison)\b/i,
  market: /\b(market size|TAM|customers|users|target audience| ICP | ideal customer)\b/i,
  technical: /\b(how to build|implementation|tech stack|architecture|tutorial|SDK|API)\b/i,
  domain: /\b(domain|url|website name|handle|username|brand name)\b/i,
  pricing: /\b(price|pricing|subscription|free|paid|monetize|revenue)\b/i,
  launch: /\b(launch|ship|release|deploy|submit|product hunt|HN|landing page)\b/i,
};

// Basic suggestions library. We can later enhance with live web fetches.
const SUGGESTIONS = {
  competitor: [
    "List your top 3 competitors and what they actually shipped in the last 30 days.",
    "Identify one gap in their product that you can ship as your differentiator.",
    "Skim their changelog/release notes to anchor your next ship on real benchmarks.",
  ],
  market: [
    "Write down 3 real customer archetypes and what they'd pay for today.",
    "Draft 5 interview questions that validate the core problem.",
    "Identify 1 subreddit/Discord/Slack where your users hang out and post a teaser.",
  ],
  technical: [
    "Pick the simplest stack that ships a demo today—what's the shortest path to live?",
    "Find a minimal SDK example and adapt it to your use case.",
    "Create a spike separating 'must-have to demo' vs 'nice-to-have after feedback'.",
  ],
  domain: [
    "Brainstorm 5 names and check availability quickly (you can validate with users before buying).",
    "Register a temporary subdomain on your current DNS and ship the landing first.",
    "Use a descriptive URL first (e.g., yourname.github.io/yourproject) to start collecting feedback.",
  ],
  pricing: [
    "Draft a simple pricing hypothesis in 2 tiers and test it with one user.",
    "Add a 'preorder / early access' button even if it's not wired yet.",
    "Write one sentence explaining why someone should pay you today.",
  ],
  launch: [
    "Write a one-sentence launch message and DM it to 5 people right now.",
    "Create a minimal landing page with a single CTA and ship it.",
    "Schedule a micro-launch this week (tweet/thread/discord post) to gather feedback.",
  ],
};

export function detectResearchTriggers(text = "") {
  const found = [];
  for (const [key, regex] of Object.entries(TRIGGERS)) {
    if (regex.test(text)) found.push(key);
  }
  return found;
}

export async function researchContext(text = "", opts = {}) {
  const triggers = detectResearchTriggers(text);
  const suggestions = triggers.flatMap((t) => SUGGESTIONS[t] || []);
  const unique = Array.from(new Set(suggestions));

  // Shape designed to be extended with real fetched data later
  return {
    triggers,
    suggestions: unique.slice(0, 6),
    nextActions: [
      "Pick one action you can complete in 30 minutes.",
      "Ship a visible artifact (landing, demo, message) and send to 3 people.",
      "Set a 45-minute timer—no research after the buzzer, ship what you have.",
    ],
    // Placeholder for future live data
    data: [],
    meta: {
      canFetchWeb: false, // flip when we wire web/API fetches
      createdAt: new Date().toISOString(),
    },
  };
}
