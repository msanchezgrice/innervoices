import React from "react";

export default function Landing({ onStart = () => {}, onShowSetup = () => {} }) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-950 dark:to-neutral-900 text-neutral-900 dark:text-neutral-100">
      {/* Header */}
      <header className="w-full border-b border-neutral-200/70 dark:border-neutral-800/70 bg-white/70 dark:bg-neutral-900/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 shadow-sm" />
            <span className="font-semibold tracking-tight">InnerVoices</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="#features"
              className="text-sm px-3 py-1.5 rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Features
            </a>
            <button
              onClick={onShowSetup}
              className="text-sm px-3 py-1.5 rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Setup guide
            </button>
            <button
              onClick={onStart}
              className="text-sm px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white border border-blue-600"
            >
              Try InnerVoices
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Your AI writing companion that thinks alongside you
            </h1>
            <p className="mt-4 text-neutral-600 dark:text-neutral-300 text-lg">
              InnerVoices provides ambient commentary while you write — like having a thoughtful friend looking over your shoulder. Stay in flow while getting timely, human-sounding insights.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={onStart}
                className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow"
              >
                Try InnerVoices
              </button>
              <button
                onClick={onShowSetup}
                className="px-4 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 font-medium"
              >
                View setup guide
              </button>
              <a
                href="#demo"
                className="px-4 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 font-medium"
              >
                Watch demo
              </a>
            </div>
            <div className="mt-4 text-xs text-neutral-500">
              Works in your browser. Bring your own OpenAI or Anthropic API key.
            </div>
          </div>

          {/* Demo Placeholder */}
          <div id="demo" className="relative rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-lg">
            <div className="aspect-video w-full rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-850 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-2">🎥</div>
                <div className="font-medium">Demo video placeholder</div>
                <div className="text-sm text-neutral-500 mt-1">Embed a short clip of the orb reacting as you type</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-xl font-bold tracking-tight mb-6">How it works</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Card
            emoji="✍️"
            title="Write naturally"
            desc="Use the built-in notes editor on the right to capture ideas, outlines, or drafts."
          />
          <Card
            emoji="🧠"
            title="Ambient analysis"
            desc="InnerVoices analyzes your text in the background using your preferred model."
          />
          <Card
            emoji="🔊"
            title="Hear commentary"
            desc="Get timely, human-sounding audio comments that nudge you forward without breaking flow."
          />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-xl font-bold tracking-tight mb-6">What you can do</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Feature emoji="🎭" title="Multiple personalities" desc="Choose a thoughtful friend, a productivity coach, a philosopher, or a witty comedian." />
          <Feature emoji="🎵" title="Natural voices" desc="Use your browser's voices or bring ElevenLabs for lifelike speech." />
          <Feature emoji="🧩" title="Smart context" desc="Understands your writing context to keep commentary relevant." />
          <Feature emoji="📝" title="Notes system" desc="Organize ideas with a Notion-like sidebar and auto-named notes." />
          <Feature emoji="🎛️" title="Customizable" desc="Tune tone, frequency, verbosity, and more in Settings." />
          <Feature emoji="🔒" title="Privacy-first" desc="Runs in your browser. API requests go directly to the provider you choose." />
        </div>
      </section>

      {/* Setup guide */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 md:p-8 bg-white/70 dark:bg-neutral-900/70 backdrop-blur">
          <h2 className="text-xl font-bold tracking-tight mb-3">Getting started</h2>
          <ol className="list-decimal pl-5 space-y-2 text-neutral-700 dark:text-neutral-300">
            <li>Click &quot;Try InnerVoices&quot; to open the app.</li>
            <li>Open Settings (⚙️ top-right) and pick a provider: OpenAI or Anthropic.</li>
            <li>Paste your API key and choose a model (GPT‑4.1, GPT‑5 mini, Claude Sonnet 4, etc.).</li>
            <li>Enable &quot;Show Thinking Overlay&quot; to see prompts and responses while testing.</li>
            <li>Optional: Enable ElevenLabs and select a voice for higher-quality speech.</li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <a
              href="https://platform.openai.com/"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Get OpenAI API key →
            </a>
            <a
              href="https://console.anthropic.com/"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Get Anthropic API key →
            </a>
            <a
              href="https://elevenlabs.io/"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Get ElevenLabs key →
            </a>
          </div>
          <div className="mt-6">
            <button
              onClick={onStart}
              className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow"
            >
              Try InnerVoices
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-4 py-10 text-sm text-neutral-500">
        <div className="flex items-center justify-between gap-3">
          <div>Built with ❤️ for focused writing.</div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              GitHub
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onShowSetup();
              }}
              className="hover:underline"
            >
              Setup guide
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Card({ emoji, title, desc }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 bg-white dark:bg-neutral-900">
      <div className="text-2xl mb-2">{emoji}</div>
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{desc}</div>
    </div>
  );
}

function Feature({ emoji, title, desc }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 bg-white dark:bg-neutral-900">
      <div className="flex items-start gap-3">
        <div className="text-xl">{emoji}</div>
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{desc}</div>
        </div>
      </div>
    </div>
  );
}
