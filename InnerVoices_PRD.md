# InnerVoices - Product Requirements Document

## Overview
InnerVoices is an AI-powered ambient commentary system that watches what you write and provides contextual audio feedback, acting as an intelligent companion while you work.

## MVP Scope (Ship in 2-3 Days)
A single-page web app with a notepad and an AI voice that comments on what you're writing.

## Tech Stack (Optimized for Speed)
```
Frontend: React + Vite (fast refresh, minimal setup)
UI: Tailwind CSS (rapid styling)
State: Zustand (simple state management)
AI: OpenAI GPT-4 API
Text-to-Speech: Browser SpeechSynthesis API (free, instant)
Hosting: Vercel (one-click deploy)
```

## File Structure
```
innervoices/
├── src/
│   ├── App.jsx           # Main app component
│   ├── components/
│   │   ├── Notepad.jsx   # Text editor
│   │   ├── Orb.jsx       # Visual indicator
│   │   └── Settings.jsx  # Configuration panel
│   ├── hooks/
│   │   ├── useWatcher.js # Text monitoring logic
│   │   └── useVoice.js   # TTS functionality
│   ├── services/
│   │   └── ai.js         # OpenAI integration
│   └── config/
│       └── prompts.js    # AI personality prompts
├── .env                   # API keys
└── package.json
```

## Core Features

### 1. Notepad Interface
```jsx
// Simple autosaving textarea
<textarea 
  placeholder="Start writing... InnerVoice is listening"
  value={text}
  onChange={handleChange}
  className="w-full h-screen p-8 text-lg"
/>
```

### 2. Watcher System
```javascript
// Check for changes every 5 seconds
const WATCH_INTERVAL = 5000; // configurable
const COMMENT_INTERVAL = 10000; // configurable

useEffect(() => {
  const interval = setInterval(() => {
    if (hasTextChanged()) {
      analyzeText();
    }
  }, WATCH_INTERVAL);
  return () => clearInterval(interval);
}, [text]);
```

### 3. AI Analysis Pipeline
```javascript
// Core analysis function
async function analyzeText(text, config) {
  const prompt = buildPrompt(text, config);
  const response = await openai.createCompletion({
    model: "gpt-4",
    prompt: prompt,
    max_tokens: 50,
    temperature: config.creativity
  });
  return response.choices[0].text;
}
```

### 4. Configurable Variables
```javascript
const DEFAULT_CONFIG = {
  // Timing
  watchInterval: 5000,      // How often to check for changes (ms)
  commentInterval: 10000,   // Minimum time between comments (ms)
  
  // Voice
  voiceEnabled: true,
  voiceSpeed: 1.0,          // 0.5 to 2.0
  voiceVolume: 0.3,         // 0 to 1
  voicePitch: 1.0,          // 0.5 to 2.0
  
  // AI Behavior
  commentProbability: 0.3,  // 0-1, chance of commenting
  maxCommentLength: 50,     // words
  creativity: 0.7,          // 0-1, AI temperature
  
  // Personality
  personality: 'friend',    // friend | coach | philosopher | comedian
  tone: 'encouraging',      // encouraging | neutral | challenging | playful
  
  // Use Cases (toggleable)
  useCases: {
    productivity: true,     // Comments on task management
    emotional: true,        // Emotional support
    ideas: true,           // Idea amplification
    patterns: true,        // Pattern recognition
    accountability: false,  // Deadline reminders
    celebration: true,     // Celebrate wins
  }
};
```

### 5. Personality Prompts
```javascript
const PERSONALITIES = {
  friend: {
    base: "You are a thoughtful friend reading over someone's shoulder. Be warm, supportive, and occasionally insightful.",
    examples: [
      "That's a really interesting point you're making.",
      "This reminds me of what you wrote earlier.",
      "You're onto something here."
    ]
  },
  coach: {
    base: "You are a productivity coach. Be motivating, action-oriented, and focused on progress.",
    examples: [
      "Great progress on breaking that down into steps!",
      "What would happen if you tackled the hardest part first?",
      "You're building momentum here."
    ]
  },
  philosopher: {
    base: "You are a philosophical thinker. Ask deep questions and make unexpected connections.",
    examples: [
      "There's a deeper pattern here worth exploring.",
      "What if the opposite were true?",
      "This touches on something fundamental."
    ]
  },
  comedian: {
    base: "You are witty and playful. Make clever observations with light humor.",
    examples: [
      "That TODO list is giving real 'ambitious Monday energy'.",
      "Plot twist: what if procrastination is just advanced planning?",
      "Your brain is spicy today!"
    ]
  }
};
```

### 6. Context Detection
```javascript
function detectContext(text) {
  const contexts = {
    todos: /(-|\*|\d+\.) \[?\s?\]?.+/gm,
    questions: /\?.+/g,
    frustration: /(frustrated|stuck|confused|annoying|hate|ugh)/gi,
    achievement: /(finished|completed|done|shipped|launched|solved)/gi,
    planning: /(will|going to|plan to|need to|should)/gi,
    reflection: /(realized|learned|understood|think|feel)/gi
  };
  
  const detected = [];
  for (const [context, regex] of Object.entries(contexts)) {
    if (regex.test(text)) detected.push(context);
  }
  return detected;
}
```

### 7. Visual Orb Component
```jsx
function Orb({ state, onClick }) {
  // States: idle, thinking, ready, speaking, muted
  const colors = {
    idle: 'bg-gray-300',
    thinking: 'bg-blue-400 animate-pulse',
    ready: 'bg-green-400 animate-bounce',
    speaking: 'bg-purple-400 animate-ping',
    muted: 'bg-gray-500 line-through'
  };
  
  return (
    <div 
      className={`fixed bottom-8 right-8 w-16 h-16 rounded-full cursor-pointer ${colors[state]}`}
      onClick={onClick}
    >
      {/* Add sound wave animation when speaking */}
    </div>
  );
}
```

### 8. Settings Panel
```jsx
function Settings({ config, onChange }) {
  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4">InnerVoice Settings</h2>
      
      {/* Personality Selector */}
      <div className="mb-4">
        <label>Personality</label>
        <select value={config.personality} onChange={(e) => onChange({personality: e.target.value})}>
          <option value="friend">Thoughtful Friend</option>
          <option value="coach">Productivity Coach</option>
          <option value="philosopher">Philosopher</option>
          <option value="comedian">Witty Comedian</option>
        </select>
      </div>
      
      {/* Frequency Slider */}
      <div className="mb-4">
        <label>Comment Frequency</label>
        <input 
          type="range" 
          min="5000" 
          max="60000" 
          value={config.commentInterval}
          onChange={(e) => onChange({commentInterval: e.target.value})}
        />
        <span>{config.commentInterval / 1000}s</span>
      </div>
      
      {/* Use Case Toggles */}
      <div className="mb-4">
        <label>Active Behaviors</label>
        {Object.keys(config.useCases).map(useCase => (
          <label key={useCase} className="block">
            <input 
              type="checkbox" 
              checked={config.useCases[useCase]}
              onChange={(e) => onChange({
                useCases: {...config.useCases, [useCase]: e.target.checked}
              })}
            />
            <span className="ml-2">{useCase}</span>
          </label>
        ))}
      </div>
      
      {/* Voice Controls */}
      <div className="mb-4">
        <label>Voice Speed</label>
        <input 
          type="range" 
          min="0.5" 
          max="2" 
          step="0.1"
          value={config.voiceSpeed}
          onChange={(e) => onChange({voiceSpeed: e.target.value})}
        />
      </div>
    </div>
  );
}
```

### 9. Main App Component
```jsx
function App() {
  const [text, setText] = useState('');
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [orbState, setOrbState] = useState('idle');
  const [showSettings, setShowSettings] = useState(false);
  
  // Core watcher hook
  useWatcher(text, config, (commentary) => {
    setOrbState('ready');
    if (config.voiceEnabled) {
      speakCommentary(commentary);
    }
  });
  
  return (
    <div className="h-screen flex">
      <Notepad value={text} onChange={setText} />
      <Orb 
        state={orbState} 
        onClick={() => setOrbState(orbState === 'muted' ? 'idle' : 'muted')}
      />
      {showSettings && <Settings config={config} onChange={setConfig} />}
      <button 
        className="fixed top-4 right-4"
        onClick={() => setShowSettings(!showSettings)}
      >
        ⚙️
      </button>
    </div>
  );
}
```

### 10. Sample Prompts by Context
```javascript
function buildPrompt(text, config, context) {
  const lastLines = text.split('\n').slice(-5).join('\n'); // Last 5 lines
  
  let prompt = `${PERSONALITIES[config.personality].base}\n\n`;
  prompt += `The user just wrote:\n"${lastLines}"\n\n`;
  
  // Context-specific instructions
  if (context.includes('todos')) {
    prompt += "They're working on a task list. ";
  }
  if (context.includes('frustration')) {
    prompt += "They seem frustrated. Be gentle and supportive. ";
  }
  if (context.includes('achievement')) {
    prompt += "They accomplished something! Celebrate appropriately. ";
  }
  
  prompt += `\nRespond in 1-2 short sentences. Be ${config.tone}. `;
  prompt += `Match this style: ${PERSONALITIES[config.personality].examples.join(' ')}`;
  
  return prompt;
}
```

## Environment Variables
```env
VITE_OPENAI_API_KEY=sk-...
VITE_ELEVENLABS_API_KEY=... # Optional, for better voices
```

## Quick Start Instructions
```bash
# Clone and setup
git clone [repo]
cd innervoices
npm install

# Add your OpenAI API key to .env
echo "VITE_OPENAI_API_KEY=sk-..." > .env

# Start development
npm run dev

# Deploy to Vercel
vercel
```

## Testing Checklist
- [ ] Text detection works every 5 seconds
- [ ] Comments appear every 10+ seconds
- [ ] Voice speaks clearly
- [ ] Orb states are visually distinct
- [ ] Settings changes take effect immediately
- [ ] Different personalities have distinct voices
- [ ] Context detection triggers appropriate responses
- [ ] Mute/unmute works properly
- [ ] No comments during rapid typing
- [ ] Comments are relevant to recent text

## Future Enhancements
1. **Memory**: Store conversation history
2. **Better Voices**: ElevenLabs integration
3. **Mac App**: Electron wrapper for system-wide watching
4. **Collaborative**: Share sessions with others
5. **Analytics**: Track which comments were helpful
6. **Custom Prompts**: Let users define their own personalities
7. **Markdown Support**: Rich text editing
8. **Export**: Save conversations as markdown

## Success Metrics
- Comments feel timely, not annoying
- 30%+ of comments spark new thoughts
- Users write for 20+ minutes per session
- Settings are adjusted (shows engagement)
- Low mute rate (<10% of sessions)

## Implementation Order
1. **Day 1 Morning**: Basic React app with textarea
2. **Day 1 Afternoon**: OpenAI integration + basic prompts
3. **Day 2 Morning**: Watcher system + timing logic
4. **Day 2 Afternoon**: Browser TTS + Orb component
5. **Day 3 Morning**: Settings panel + config system
6. **Day 3 Afternoon**: Polish + deploy to Vercel

---

## Copy-Paste Starter Code

### package.json
```json
{
  "name": "innervoices",
  "version": "0.1.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "openai": "^4.0.0",
    "zustand": "^4.4.0",
    "clsx": "^2.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.24",
    "tailwindcss": "^3.3.0",
    "vite": "^4.4.0"
  }
}
```

### vite.config.js
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

### tailwind.config.js
```javascript
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

This PRD provides everything needed to build the MVP in 2-3 days. The key is starting simple (just the notepad + basic comments) and iterating from there.