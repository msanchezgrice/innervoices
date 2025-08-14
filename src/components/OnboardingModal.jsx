import React, { useState } from "react";

const OPENAI_MODELS = [
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-nano",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gpt-3.5-turbo",
];

export default function OnboardingModal({
  open = false,
  onClose = () => {},
  onComplete = () => {},
  onSaveOpenAI = ({ apiKey, model }) => {},
}) {
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const steps = [
    { title: "Welcome", subtitle: "Your AI writing companion that thinks alongside you." },
    { title: "Set up your API key", subtitle: "Enter your OpenAI API key and choose a model." },
    { title: "Meet the Orb", subtitle: "The Orb lives at the bottom center. Click to Start/Pause." },
  ];

  if (!open) return null;

  const handleNext = async () => {
    if (step === 1) {
      try {
        await onSaveOpenAI({ apiKey: apiKey.trim(), model });
      } catch {}
    }
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
      onClose();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSkip = () => {
    onComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm text-neutral-500">{`Step ${step + 1} of ${steps.length}`}</div>
            <h3 className="text-lg font-semibold tracking-tight">{steps[step].title}</h3>
            <div className="text-sm text-neutral-500">{steps[step].subtitle}</div>
          </div>
          <button
            aria-label="Close"
            className="p-2 rounded-md border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800"
            onClick={handleSkip}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" className="text-neutral-500"><path fill="currentColor" d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59L7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-neutral-700 dark:text-neutral-300">
                InnerVoices provides ambient commentary while you write. It runs entirely in your browser and uses your chosen model via API.
              </p>
              <ul className="list-disc pl-5 text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                <li>Bring your own OpenAI API key</li>
                <li>Choose a model like GPT‑4.1 or GPT‑5 mini</li>
                <li>Optional: Add ElevenLabs for lifelike speech</li>
              </ul>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">OpenAI API Key</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <div className="text-xs text-neutral-500 mt-1">
                  Tip: You can also set Vercel env var VITE_OPENAI_API_KEY for a preconfigured demo.
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  {OPENAI_MODELS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 text-xs text-neutral-600 dark:text-neutral-400">
                We only support OpenAI in this build. Anthropic is disabled for now due to browser CORS.
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50 dark:bg-neutral-900">
                <div className="text-sm font-medium mb-2">The Orb</div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  The Orb sits at the <b>bottom center</b>. Click to Start/Pause. Alt+Click to Mute/Unmute. Drag to move. Colors indicate state (thinking, tooling, ready, speaking).
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="text-sm font-medium mb-2">Keys you might set later</div>
                <ul className="list-disc pl-5 text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li>ElevenLabs API key for higher-quality voice</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <button
            className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-sm"
            onClick={handleBack}
            disabled={step === 0}
          >
            Back
          </button>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-sm"
              onClick={handleSkip}
            >
              Skip
            </button>
            <button
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm border border-blue-600"
              onClick={handleNext}
            >
              {step < steps.length - 1 ? "Next" : "Finish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
