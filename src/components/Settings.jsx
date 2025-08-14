import { useEffect, useMemo, useState } from "react";
import { useConfigStore } from "../store/useConfigStore";
import { useVoices } from "../hooks/useVoices";
import { useVoice } from "../hooks/useVoice";
import { listElevenLabsVoices } from "../services/tts/elevenlabsApi";

const PERSONALITY_OPTIONS = [
  { value: "friend", label: "Thoughtful Friend" },
  { value: "coach", label: "Productivity Coach" },
  { value: "philosopher", label: "Philosopher" },
  { value: "comedian", label: "Witty Comedian" },
];

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

const ANTHROPIC_MODELS = [
  "claude-opus-4-1-20250805",
  "claude-opus-4-20250514",
  "claude-sonnet-4-20250514",
  "claude-3-7-sonnet-20250219",
  "claude-3-7-sonnet-latest",
  "claude-3-5-haiku-20241022",
  "claude-3-5-haiku-latest",
  "claude-3-haiku-20240307",
];

export default function Settings() {
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const browserVoices = useVoices();
  const { speak } = useVoice(config);

  const [elVoices, setElVoices] = useState([]);
  const [loadingEL, setLoadingEL] = useState(false);
  const [elError, setElError] = useState("");

  const useCaseList = useMemo(
    () => Object.keys(config.useCases || {}),
    [config.useCases]
  );

  useEffect(() => {
    // Auto-load ElevenLabs voices when API key is set and provider selected
    let mounted = true;
    async function load() {
      if (config.ttsProvider !== "elevenlabs" || !config.elevenlabsApiKey) {
        setElVoices([]);
        setElError("");
        return;
      }
      try {
        setLoadingEL(true);
        setElError("");
        const v = await listElevenLabsVoices(config.elevenlabsApiKey);
        if (mounted) setElVoices(v);
      } catch (err) {
        if (mounted) {
          setElError(err?.message || "Failed to load ElevenLabs voices.");
          setElVoices([]);
        }
      } finally {
        if (mounted) setLoadingEL(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [config.ttsProvider, config.elevenlabsApiKey]);

  const currentProvider = "openai";
  const modelOptions =
    currentProvider === "anthropic" ? ANTHROPIC_MODELS : OPENAI_MODELS;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-neutral-900 shadow-lg p-6 border-l border-neutral-200 dark:border-neutral-800 overflow-y-auto z-40">
      <h2 className="text-xl font-bold mb-4">InnerVoice Settings</h2>

      {/* Personality */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Personality</label>
        <select
          className="w-full border rounded px-3 py-2 bg-white dark:bg-neutral-800"
          value={config.personality}
          onChange={(e) => updateConfig({ personality: e.target.value })}
        >
          {PERSONALITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
          <option value="custom">Custom…</option>
        </select>
        {config.personality === "custom" && (
          <textarea
            className="mt-2 w-full border rounded px-3 py-2 bg-white dark:bg-neutral-800 h-20"
            placeholder="Describe the assistant's personality and style..."
            value={config.personalityCustom || ""}
            onChange={(e) => updateConfig({ personalityCustom: e.target.value })}
          />
        )}
      </div>

      {/* Tone */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Tone</label>
        <select
          className="w-full border rounded px-3 py-2 bg-white dark:bg-neutral-800"
          value={config.tone}
          onChange={(e) => updateConfig({ tone: e.target.value })}
        >
          <option value="encouraging">Encouraging</option>
          <option value="neutral">Neutral</option>
          <option value="challenging">Challenging</option>
          <option value="playful">Playful</option>
          <option value="custom">Custom…</option>
        </select>
        {config.tone === "custom" && (
          <input
            type="text"
            className="mt-2 w-full border rounded px-3 py-2 bg-white dark:bg-neutral-800"
            placeholder="e.g., reflective yet upbeat"
            value={config.toneCustom || ""}
            onChange={(e) => updateConfig({ toneCustom: e.target.value })}
          />
        )}
      </div>

      {/* Frequency */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">
          Comment Frequency
        </label>
        <input
          type="range"
          min="5000"
          max="60000"
          step="500"
          value={config.commentInterval}
          onChange={(e) =>
            updateConfig({ commentInterval: Number(e.target.value) })
          }
          className="w-full"
        />
        <div className="text-xs mt-1">
          Every {(config.commentInterval / 1000).toFixed(1)}s minimum
        </div>
      </div>

      {/* Probability */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">
          Comment Probability
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={config.commentProbability}
          onChange={(e) =>
            updateConfig({ commentProbability: Number(e.target.value) })
          }
          className="w-full"
        />
        <div className="text-xs mt-1">
          {(config.commentProbability * 100).toFixed(0)}% chance on each check
        </div>
      </div>

      {/* Creativity */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Creativity</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={config.creativity}
          onChange={(e) =>
            updateConfig({ creativity: Number(e.target.value) })
          }
          className="w-full"
        />
      </div>

      {/* Max length */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">
          Max Comment Length (words)
        </label>
        <input
          type="number"
          className="w-full border rounded px-3 py-2 bg-white dark:bg-neutral-800"
          value={config.maxCommentLength}
          min={10}
          max={300}
          onChange={(e) =>
            updateConfig({ maxCommentLength: Number(e.target.value) })
          }
        />
      </div>

      {/* AI Provider & Models */}
      <div className="mb-6">
        <div className="font-semibold mb-2">AI Provider</div>
        <select
          className="w-full border rounded px-3 py-2 bg-white dark:bg-neutral-800 mb-3"
          value="openai"
          disabled
        >
          <option value="openai">OpenAI</option>
        </select>

        {currentProvider === "openai" ? (
          <>
            <label className="block text-sm font-medium mb-1">
              OpenAI API Key
            </label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 bg-white dark:bg-neutral-800 mb-3"
              value={config.openaiApiKey || ""}
              onChange={(e) => updateConfig({ openaiApiKey: e.target.value })}
              placeholder="sk-..."
            />
            <label className="block text-sm font-medium mb-1">OpenAI Model</label>
            <select
              className="w-full border rounded px-3 py-2 bg-white dark:bg-neutral-800"
              value={config.openaiModel || "gpt-5-mini"}
              onChange={(e) => updateConfig({ openaiModel: e.target.value })}
            >
              {OPENAI_MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
            <label className="block text-sm font-medium mb-1">
              Anthropic API Key
            </label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 bg-white dark:bg-neutral-800 mb-3"
              value={config.anthropicApiKey || ""}
              onChange={(e) => updateConfig({ anthropicApiKey: e.target.value })}
              placeholder="anthropic-key"
            />
            <label className="block text-sm font-medium mb-1">
              Anthropic Model
            </label>
            <select
              className="w-full border rounded px-3 py-2 bg-white dark:bg-neutral-800"
              value={config.anthropicModel || "claude-3-5-sonnet-latest"}
              onChange={(e) => updateConfig({ anthropicModel: e.target.value })}
            >
              {ANTHROPIC_MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Prompt / Tokens / Tools */}
      <div className="mb-6">
        <div className="font-semibold mb-2">Prompt &amp; Output</div>
        <label className="block text-sm font-medium mb-1">System Prompt</label>
        <textarea
          className="w-full border rounded px-3 py-2 bg-white dark:bg-neutral-800 h-28"
          value={config.systemPrompt || ""}
          onChange={(e) => updateConfig({ systemPrompt: e.target.value })}
          placeholder="You produce timely ambient commentary for a writer..."
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Max Tokens</label>
            <input
              type="number"
              min={60}
              max={50000}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-neutral-800"
              value={config.maxTokens ?? 10000}
              onChange={(e) =>
                updateConfig({ maxTokens: Number(e.target.value) })
              }
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!config.allowToolCalling}
              onChange={(e) =>
                updateConfig({ allowToolCalling: e.target.checked })
              }
            />
            <span className="text-sm font-medium">Enable Tool Calling</span>
          </label>
        </div>
      </div>

      {/* Use Cases */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Active Behaviors
        </label>
        <div className="space-y-2">
          {useCaseList.map((key) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!config.useCases[key]}
                onChange={(e) =>
                  updateConfig({
                    useCases: { [key]: e.target.checked },
                  })
                }
              />
              <span className="capitalize">{key}</span>
            </label>
          ))}
        </div>
      </div>

      {/* UI Toggles */}
      <div className="mb-6">
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!config.showNotes}
              onChange={(e) => updateConfig({ showNotes: e.target.checked })}
            />
            <span className="text-sm">Show Notes Sidebar (Cmd/Ctrl+B)</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!config.showTraceOverlay}
              onChange={(e) => updateConfig({ showTraceOverlay: e.target.checked })}
            />
            <span className="text-sm">Show Thinking Overlay (draggable)</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!config.debugLogging}
              onChange={(e) => updateConfig({ debugLogging: e.target.checked })}
            />
            <span className="text-sm">Enable Debug Logging (console)</span>
          </label>
        </div>
      </div>

      {/* TTS Provider */}
      <div className="mb-4">
        <div className="font-semibold mb-2">Voice Provider</div>
        <select
          className="w-full border rounded px-3 py-2 bg-white dark:bg-neutral-800 mb-3"
          value={config.ttsProvider}
          onChange={(e) => updateConfig({ ttsProvider: e.target.value })}
        >
          <option value="browser">Browser (SpeechSynthesis)</option>
          <option value="elevenlabs">ElevenLabs</option>
        </select>
      </div>

      {/* Voice Controls */}
      <div className="mb-6">
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={!!config.voiceEnabled}
            onChange={(e) => updateConfig({ voiceEnabled: e.target.checked })}
          />
          <span className="text-sm font-medium">Enable Voice</span>
        </label>

        {/* Provider-specific selectors */}
        {config.ttsProvider === "elevenlabs" ? (
          <>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">
                ElevenLabs API Key
              </label>
              <input
                type="password"
                className="w-full border rounded px-3 py-2 bg-white dark:bg-neutral-800"
                value={config.elevenlabsApiKey || ""}
                onChange={(e) =>
                  updateConfig({ elevenlabsApiKey: e.target.value })
                }
                placeholder="xi-api-key"
              />
              <button
                type="button"
                className="mt-2 text-xs px-2 py-1 border rounded bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                onClick={async () => {
                  try {
                    setLoadingEL(true);
                    setElError("");
                    const v = await listElevenLabsVoices(
                      config.elevenlabsApiKey
                    );
                    setElVoices(v);
                  } catch (err) {
                    setElVoices([]);
                    setElError(err?.message || "Failed to load ElevenLabs voices.");
                  } finally {
                    setLoadingEL(false);
                  }
                }}
              >
                {loadingEL ? "Loading voices..." : "Load voices"}
              </button>
              {elError && (
                <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                  {elError}
                </div>
              )}
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">
                ElevenLabs Voice
              </label>
              <select
                className="w-full border rounded px-3 py-2 bg-white dark:bg-neutral-800"
                value={config.elevenlabsVoiceId || ""}
                onChange={(e) =>
                  updateConfig({ elevenlabsVoiceId: e.target.value })
                }
              >
                <option value="">Select a voice</option>
                {elVoices.map((v) => (
                  <option key={v.voice_id} value={v.voice_id}>
                    {v.name || v.voice_id}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Voice</label>
            <select
              className="w-full border rounded px-3 py-2 bg-white dark:bg-neutral-800"
              value={config.voiceName || ""}
              onChange={(e) => updateConfig({ voiceName: e.target.value })}
            >
              <option value="">Auto (best available)</option>
              {browserVoices.map((v) => (
                <option key={`${v.name}-${v.lang}`} value={v.name}>
                  {v.name} {v.lang ? `(${v.lang})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="button"
          className="mt-1 text-xs px-2 py-1 border rounded bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700"
          onClick={() =>
            speak(
              "Hi, this is your InnerVoice. Testing your current voice settings."
            )
          }
        >
          Test voice
        </button>

        <div className="mb-4 mt-4">
          <label className="block text-sm font-medium mb-1">Speed</label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={config.voiceSpeed}
            onChange={(e) =>
              updateConfig({ voiceSpeed: Number(e.target.value) })
            }
            className="w-full"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Volume</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={config.voiceVolume}
            onChange={(e) =>
              updateConfig({ voiceVolume: Number(e.target.value) })
            }
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Pitch</label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={config.voicePitch}
            onChange={(e) =>
              updateConfig({ voicePitch: Number(e.target.value) })
            }
            className="w-full"
          />
        </div>

        <div className="text-[11px] text-neutral-500 mt-3">
          Tip: Click orb to Start/Pause. Alt+Click orb to Mute/Unmute.
        </div>
      </div>
    </div>
  );
}
