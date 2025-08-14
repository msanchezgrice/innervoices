# ShipMode Implementation Code - Paste into Cursor

## 1. Update System Prompt (`src/config/prompts.js`)

```javascript
// Add this to your prompts.js file

export const SHIP_MODE_SYSTEM_PROMPT = `You are Ship Mode - an AI that keeps founders focused on shipping instead of planning.

You've seen hundreds of startups fail from the same mistakes: overthinking, over-building, and under-talking to customers. Your job is to keep the founder in "ship mode" - a state of constant action toward launching.

Core principles:
1. Ship beats perfect - Always push toward launching something TODAY
2. Customers over concepts - Real feedback > hypothetical features  
3. Focus over features - One thing done > ten things planned
4. Revenue over runway - Making $1 > raising $1M
5. Clarity over comfort - Hard truths > false hope

Your style:
- Short, punchy insights (1-2 sentences max)
- Reference their specific context (project names, tasks mentioned)
- Celebrate shipping, then immediately push for more
- Ask uncomfortable questions they're avoiding
- Direct but not cruel, pushy but not toxic
- Increase intensity if no action is taken

Context patterns to watch for:
- If writing todos → "Pick ONE and ship it. Which can you launch in 1 hour?"
- If planning features → "Who asked for this? Name a real customer."
- If mentioning competitors → "They shipped. You're still planning."
- If making excuses → "You said this last week too. Pattern much?"
- If they actually ship → "FINALLY. Now get it in front of 10 people today."

Never give generic advice. Always be specific to what they just wrote.`;

// Update your existing buildSystemPrompt function
export function buildSystemPrompt(config) {
  // If ship mode is enabled, use the ship mode prompt
  if (config.shipModeEnabled !== false) {
    return SHIP_MODE_SYSTEM_PROMPT;
  }
  
  // Otherwise use your existing prompt builder
  return buildOriginalSystemPrompt(config);
}
```

## 2. Add Ship Mode Configuration (`src/config/defaults.js`)

```javascript
// Add these ship mode specific settings to your DEFAULT_CONFIG

export const SHIP_MODE_CONFIG = {
  // Timing
  watchInterval: 5000,        // Check every 5 seconds
  commentInterval: 15000,     // Minimum 15 seconds between comments
  
  // Behavior  
  commentProbability: 0.35,   // 35% chance of commenting
  maxCommentLength: 80,       // Keep it punchy
  temperature: 0.75,          // Some variation, not random
  
  // Ship Mode Specific
  shipModeEnabled: true,      // Default on
  shipModeIntensity: 'brutal', // 'gentle' | 'direct' | 'brutal'
  
  // Pattern Detection
  detectPatterns: true,       // Remember repeated behaviors
  trackCommitments: true,     // "You said you'd ship today"
  escalateOnInaction: true,   // Get more direct over time
};

// Merge with your existing DEFAULT_CONFIG
export const DEFAULT_CONFIG = {
  ...YOUR_EXISTING_CONFIG,
  ...SHIP_MODE_CONFIG,
};
```

## 3. Enhanced Context Detection (`src/utils/detectContext.js`)

```javascript
// Add this enhanced context detection for Ship Mode

export function detectShipModeContext(text) {
  // Only analyze recent text (last 2000 chars)
  const recentText = text.slice(-2000).toLowerCase();
  
  const patterns = {
    // Planning/Overthinking
    planning: {
      regex: /should|maybe|thinking about|considering|might|perhaps|possibly/gi,
      response: 'push_to_ship',
      intensity: 0.8
    },
    
    // Feature Creep
    featureCreep: {
      regex: /another feature|also add|what if we|it would be cool|nice to have/gi,
      response: 'focus_on_one',
      intensity: 0.9
    },
    
    // Competitor Obsession
    competitors: {
      regex: /competitor|they have|market leader|others are|everyone else/gi,
      response: 'stop_comparing',
      intensity: 0.7
    },
    
    // Analysis Paralysis
    research: {
      regex: /research|analyze|study|investigate|explore|look into/gi,
      response: 'stop_researching',
      intensity: 0.9
    },
    
    // Excuses
    excuses: {
      regex: /but|however|cant|wont|unable|impossible|too hard/gi,
      response: 'no_excuses',
      intensity: 1.0
    },
    
    // Actual Progress
    shipping: {
      regex: /shipped|launched|deployed|released|live|finished|completed/gi,
      response: 'celebrate_and_push',
      intensity: 0.3
    },
    
    // Todo Lists
    todos: {
      regex: /todo|task|need to|\[\s?\]|\-\s/gi,
      response: 'pick_one_ship',
      intensity: 0.8
    }
  };
  
  // Score each pattern
  let primaryPattern = null;
  let maxScore = 0;
  
  for (const [key, pattern] of Object.entries(patterns)) {
    const matches = recentText.match(pattern.regex);
    const score = matches ? matches.length * pattern.intensity : 0;
    
    if (score > maxScore) {
      maxScore = score;
      primaryPattern = {
        type: key,
        response: pattern.response,
        confidence: Math.min(score / 10, 1) // Normalize to 0-1
      };
    }
  }
  
  return primaryPattern || { type: 'general', response: 'keep_shipping', confidence: 0.5 };
}
```

## 4. Ship Mode Response Builder (`src/config/shipModeResponses.js`)

```javascript
// Create new file: src/config/shipModeResponses.js

export const SHIP_MODE_RESPONSES = {
  push_to_ship: [
    "Stop planning. What can you ship in the next hour?",
    "You're overthinking. Ship something ugly today.",
    "Analysis paralysis. Pick one thing and launch it.",
    "Planning is procrastination. Ship now, fix later.",
    "Every minute planning is a minute not shipping."
  ],
  
  focus_on_one: [
    "Cool feature. Who asked for it? Name them.",
    "Feature #8? Have you shipped #1 yet?",
    "Stop adding. Start shipping.",
    "Your MVP has become an EVP. Ship something.",
    "Perfect is the enemy of shipped."
  ],
  
  stop_comparing: [
    "They shipped. You're still watching. See the problem?",
    "Stop checking competitors. Start checking customers.",
    "Your competitor obsession is why you're not shipping.",
    "Nobody cares what they have if you execute better.",
    "Comparison is procrastination in disguise."
  ],
  
  stop_researching: [
    "You've researched enough. Ship and learn.",
    "Real data comes from real users, not research.",
    "Research is comfortable. Shipping is scary. Do the scary thing.",
    "You're hiding in research. Time to build.",
    "3 days of research, 0 days of shipping. Problem?"
  ],
  
  no_excuses: [
    "That's an excuse, not a reason.",
    "You said this exact thing last week.",
    "Excuses don't ship products.",
    "Other founders with less resources already shipped.",
    "Stop explaining why you can't. Start showing that you can."
  ],
  
  celebrate_and_push: [
    "FINALLY! Now get it in front of 10 people today.",
    "Good. Ship the next thing before you lose momentum.",
    "That's what I'm talking about. What's next?",
    "Shipped! Now iterate based on real feedback.",
    "YES! Keep this energy. Ship again tomorrow."
  ],
  
  pick_one_ship: [
    "10 todos, 0 shipped. Pick ONE and launch it now.",
    "Stop making lists. Ship the first item.",
    "Your todo list is a graveyard of good intentions.",
    "Which ONE task gets you a customer today?",
    "Lists are for groceries. Pick one and ship."
  ],
  
  keep_shipping: [
    "When did you last ship something?",
    "What's blocking you from shipping today?",
    "Your users are waiting. Ship something.",
    "Default to action. Ship first, perfect later.",
    "Remember: shipped > perfect."
  ]
};

// Function to get contextual response
export function getShipModeResponse(context, previousResponses = []) {
  const responses = SHIP_MODE_RESPONSES[context.response] || SHIP_MODE_RESPONSES.keep_shipping;
  
  // Avoid repeating recent responses
  const availableResponses = responses.filter(r => !previousResponses.includes(r));
  
  if (availableResponses.length === 0) {
    // If all responses have been used, reset
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  return availableResponses[Math.floor(Math.random() * availableResponses.length)];
}
```

## 5. Update Watcher Hook (`src/hooks/useWatcher.js`)

```javascript
// Update your useWatcher.js to use Ship Mode

import { detectShipModeContext } from '../utils/detectContext';
import { getShipModeResponse } from '../config/shipModeResponses';
import { SHIP_MODE_SYSTEM_PROMPT } from '../config/prompts';

export function useWatcher() {
  const [recentResponses, setRecentResponses] = useState([]);
  
  const analyze = useCallback(async () => {
    try {
      // Detect context for Ship Mode
      const context = detectShipModeContext(noteContent);
      
      // Only proceed if confidence is high enough
      if (context.confidence < 0.3) {
        return; // Don't comment on unclear context
      }
      
      // Check if Ship Mode is enabled
      if (config.shipModeEnabled !== false) {
        // Get a contextual response
        const shipModeResponse = getShipModeResponse(context, recentResponses);
        
        // Update recent responses (keep last 5)
        setRecentResponses(prev => [...prev.slice(-4), shipModeResponse]);
        
        // Use Ship Mode system prompt
        const systemPrompt = SHIP_MODE_SYSTEM_PROMPT;
        
        // Build the full prompt
        const prompt = `${systemPrompt}
        
Context detected: ${context.type}
Confidence: ${Math.round(context.confidence * 100)}%
Recent text: "${noteContent.slice(-500)}"

Respond with: ${shipModeResponse}

Make it specific to their text. Keep it under 2 sentences.`;
        
        // Call your AI service
        const response = await callOpenAI({
          systemPrompt,
          prompt,
          temperature: config.temperature || 0.75,
          maxTokens: config.maxCommentLength || 80
        });
        
        // Speak the response
        if (response && config.voiceEnabled) {
          speak(response);
        }
        
        // Update trace for debugging
        trace.setThinking({
          context: context.type,
          confidence: context.confidence,
          response: shipModeResponse,
          aiResponse: response
        });
      }
    } catch (error) {
      console.error('Ship Mode error:', error);
    }
  }, [noteContent, config, recentResponses]);
  
  // Rest of your watcher implementation...
}
```

## 6. Update Settings Component (`src/components/Settings.jsx`)

```javascript
// Add Ship Mode settings to your Settings component

function Settings({ config, updateConfig }) {
  return (
    <div className="settings-panel">
      {/* Your existing settings */}
      
      {/* Ship Mode Section */}
      <div className="setting-group border-t pt-4 mt-4">
        <h3 className="text-lg font-semibold mb-4">⚡ Ship Mode</h3>
        
        <label className="flex items-center space-x-3 mb-4">
          <input
            type="checkbox"
            checked={config.shipModeEnabled !== false}
            onChange={(e) => updateConfig({ shipModeEnabled: e.target.checked })}
            className="w-4 h-4"
          />
          <span>Enable Ship Mode (Brutal Cofounder)</span>
        </label>
        
        {config.shipModeEnabled && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Intensity Level
              </label>
              <select
                value={config.shipModeIntensity || 'brutal'}
                onChange={(e) => updateConfig({ shipModeIntensity: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="gentle">Gentle Push</option>
                <option value="direct">Direct & Clear</option>
                <option value="brutal">Brutal Truth</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Comment Frequency (seconds)
              </label>
              <input
                type="range"
                min="10"
                max="60"
                value={config.commentInterval / 1000}
                onChange={(e) => updateConfig({ commentInterval: e.target.value * 1000 })}
                className="w-full"
              />
              <span className="text-xs text-gray-500">
                Every {config.commentInterval / 1000} seconds minimum
              </span>
            </div>
            
            <div className="mb-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={config.escalateOnInaction}
                  onChange={(e) => updateConfig({ escalateOnInaction: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Get more direct when I don't act</span>
              </label>
            </div>
            
            <div className="mb-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={config.trackCommitments}
                  onChange={(e) => updateConfig({ trackCommitments: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Remember what I commit to</span>
              </label>
            </div>
          </>
        )}
        
        <div className="bg-gray-100 p-3 rounded text-sm text-gray-600 mt-4">
          <p className="font-semibold mb-1">🎯 Ship Mode Active</p>
          <p>AI will push you to ship instead of plan. Expect direct feedback on procrastination, overthinking, and excuses.</p>
        </div>
      </div>
    </div>
  );
}
```

## 7. Update Orb Component (`src/components/Orb.jsx`)

```javascript
// Add Ship Mode visual indicator to your Orb

function Orb({ state, config, thinking }) {
  const isShipMode = config.shipModeEnabled !== false;
  
  return (
    <div className="orb-container">
      <div 
        className={`orb ${state} ${isShipMode ? 'ship-mode-active' : ''}`}
        style={{
          background: isShipMode 
            ? 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)' 
            : 'linear-gradient(135deg, #6B46C1 0%, #9333EA 100%)'
        }}
      >
        {/* Orb content */}
        {isShipMode && state === 'idle' && (
          <span className="text-xs">🚀</span>
        )}
      </div>
      
      {/* Ship Mode Badge */}
      {isShipMode && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 
                        bg-red-900 text-white text-xs px-2 py-1 rounded
                        whitespace-nowrap">
          Ship Mode: {config.shipModeIntensity || 'ON'}
        </div>
      )}
    </div>
  );
}
```

## 8. Testing Checklist

```javascript
// Add this to your testing file or notes

const SHIP_MODE_TEST_CASES = [
  {
    input: "Maybe we should add user authentication after we finish the dashboard",
    expected: "Push to ship one thing first"
  },
  {
    input: "I need to research competitors before deciding",
    expected: "Stop researching, start shipping"
  },
  {
    input: "Just shipped the API integration!",
    expected: "Celebrate then push for next action"
  },
  {
    input: "TODO: refactor code, add tests, update docs, design logo",
    expected: "Pick ONE todo and ship it"
  },
  {
    input: "But I can't ship because [excuse]",
    expected: "Call out the excuse pattern"
  }
];

// Test each case and verify Ship Mode responds appropriately
```

## Quick Start Instructions

1. **Copy all code sections** above into their respective files
2. **Update your imports** to include the new Ship Mode modules
3. **Test with sample text** to ensure responses are working
4. **Adjust intensity** based on user feedback
5. **Track metrics** on which responses drive action

## Environment Variables

```env
# Add to your .env file
VITE_SHIP_MODE_ENABLED=true
VITE_SHIP_MODE_DEFAULT_INTENSITY=brutal
VITE_SHIP_MODE_COMMENT_INTERVAL=15000
```

## Deployment Notes

- Ship Mode should be **ON by default** for new users
- Include onboarding that explains what Ship Mode does
- Add a "snooze" feature for when users need focused work time
- Track which comments actually lead to shipping behavior

---

This implementation turns your InnerVoices app into ShipMode - the AI that keeps founders shipping instead of planning.