import { useEffect, useState } from "react";
import Notepad from "./components/Notepad.jsx";
import Orb from "./components/Orb.jsx";
import Settings from "./components/Settings.jsx";
import NotesSidebar from "./components/NotesSidebar.jsx";
import ThinkingOverlay from "./components/ThinkingOverlay.jsx";
import { useWatcher } from "./hooks/useWatcher.js";
import { useVoice } from "./hooks/useVoice.js";
import { useConfigStore } from "./store/useConfigStore.js";
import { useNotesStore } from "./store/useNotesStore.js";
import Landing from "./components/Landing.jsx";
import OnboardingModal from "./components/OnboardingModal.jsx";

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showLanding, setShowLanding] = useState(() => {
    try {
      return !localStorage.getItem("iv_has_seen_landing");
    } catch {
      return true;
    }
  });

  const startFromLanding = () => {
    try {
      localStorage.setItem("iv_has_seen_landing", "1");
    } catch {}
    setShowLanding(false);
  };

  const showSetupFromLanding = () => {
    try {
      localStorage.setItem("iv_has_seen_landing", "1");
    } catch {}
    setShowLanding(false);
    setShowSettings(true);
  };

  // Onboarding after landing
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return !localStorage.getItem("iv_onboarded");
    } catch {
      return true;
    }
  });

  const handleOnboardingSave = ({ apiKey, model }) => {
    if (apiKey) updateConfig({ openaiApiKey: apiKey });
    if (model) updateConfig({ openaiModel: model });
  };

  const handleOnboardingComplete = () => {
    try {
      localStorage.setItem("iv_onboarded", "1");
    } catch {}
    setShowOnboarding(false);
    setShowSettings(true);
  };


  // Notes state: drive Notepad from the selected note
  const notes = useNotesStore((s) => s.notes);
  const currentId = useNotesStore((s) => s.currentId);
  const updateContent = useNotesStore((s) => s.updateContent);
  const activeNote = notes.find((n) => n.id === currentId) || null;

  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const orbState = useConfigStore((s) => s.orbState);
  const setOrbState = useConfigStore((s) => s.setOrbState);
  const toggleMute = useConfigStore((s) => s.toggleMute);
  const isActive = useConfigStore((s) => s.isActive);
  const toggleActive = useConfigStore((s) => s.toggleActive);
  const setTrace = useConfigStore((s) => s.setTrace);
  const clearTrace = useConfigStore((s) => s.clearTrace);

  const { speak, cancel } = useVoice(config, {
    onStart: () => setOrbState("speaking"),
    onEnd: () => setOrbState("idle"),
  });

  useWatcher(activeNote?.content || "", config, {
    onThinking: () => {
      if (useConfigStore.getState().orbState !== "muted") {
        setOrbState("thinking");
      }
      clearTrace();
      setTrace({
        thinking: true,
        tooling: false,
        error: null,
        startedAt: Date.now(),
        provider: "",
        model: "",
      });
    },
    onToolStart: () => {
      if (useConfigStore.getState().orbState !== "muted") {
        setOrbState("tooling");
      }
      setTrace({ tooling: true });
    },
    onToolEnd: () => {
      if (
        useConfigStore.getState().orbState !== "muted" &&
        useConfigStore.getState().orbState !== "speaking"
      ) {
        setOrbState("thinking");
      }
      setTrace({ tooling: false });
    },
    onPrompt: (p) => {
      setTrace((t) => ({ ...t, prompt: p }));
    },
    onApiStart: ({ provider, model }) => {
      setTrace((t) => ({ ...t, provider: provider || "", model: model || "", thinking: true }));
    },
    onApiEnd: ({ ok, error, ms }) => {
      setTrace((t) => ({
        ...t,
        finishedAt: Date.now(),
        thinking: false,
        error: ok ? null : (error || "Unknown API error"),
      }));
      if (!ok && useConfigStore.getState().orbState !== "muted") {
        setOrbState("error");
        setTimeout(() => {
          if (useConfigStore.getState().orbState === "error") {
            setOrbState("idle");
          }
        }, 2000);
      }
      if (config.debugLogging) {
        console.debug("[InnerVoices][App] API end in", ms, "ms ok:", ok);
      }
    },
    onResponse: (r) => {
      setTrace((t) => ({ ...t, response: r || "" }));
    },
    onSystemPrompt: (s) => {
      setTrace((t) => ({ ...t, systemPrompt: s || "" }));
    },
    onMeta: (m) => {
      setTrace((t) => ({ ...t, meta: { ...(t?.meta || {}), ...(m || {}) } }));
    },
    onComment: (commentary) => {
      if (useConfigStore.getState().orbState === "muted") return;
      setOrbState("ready");
      if (config.voiceEnabled) {
        speak(commentary);
      }
    },
    onError: (e) => {
      setTrace((t) => ({ ...t, error: e?.message || String(e), thinking: false, tooling: false }));
      if (useConfigStore.getState().orbState !== "muted") {
        setOrbState("error");
        setTimeout(() => {
          if (useConfigStore.getState().orbState === "error") {
            setOrbState("idle");
          }
        }, 2000);
      }
    },
    enabled: isActive && !showLanding && !showOnboarding,
  });

  useEffect(() => {
    const onKey = (e) => {
      const b = e.key === "b" || e.key === "B";
      if ((e.metaKey || e.ctrlKey) && b) {
        e.preventDefault();
        const st = useConfigStore.getState();
        st.updateConfig({ showNotes: !st.config.showNotes });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleOrbClick = (e) => {
    // If speaking, stop immediately, then toggle action
    if (orbState === "speaking") cancel();
    if (e && e.altKey) {
      // Alt+Click toggles mute
      toggleMute();
    } else {
      // Click toggles Start/Pause (watcher active)
      toggleActive();
    }
  };

  return (
    <div className="w-screen h-screen flex">
      {config.showNotes && <NotesSidebar />}
      <div className={`flex-1 h-full ${!config.showNotes ? "pl-12" : ""}`}>
        <Notepad
          value={activeNote?.content || ""}
          onChange={(v) => activeNote && updateContent(activeNote.id, v)}
        />
      </div>

      <Orb state={orbState} isActive={isActive} onClick={handleOrbClick} />

      {showSettings && <Settings />}
      <ThinkingOverlay />

      {showLanding && (
        <div className="fixed inset-0 z-[100]">
          <Landing onStart={startFromLanding} onShowSetup={showSetupFromLanding} />
        </div>
      )}

      {!showLanding && showOnboarding && (
        <OnboardingModal
          open
          onSaveOpenAI={handleOnboardingSave}
          onComplete={handleOnboardingComplete}
          onClose={handleOnboardingComplete}
        />
      )}

      {!config.showNotes && (
        <button
          className="fixed top-4 left-4 z-50 border rounded px-3 py-1 bg-white/80 dark:bg-neutral-800 shadow hover:bg-white dark:hover:bg-neutral-700"
          onClick={() => updateConfig({ showNotes: true })}
          title="Show Notes"
        >
          ☰
        </button>
      )}


      <button
        className="fixed top-4 right-4 z-50 border rounded px-2.5 py-2 bg-white/80 dark:bg-neutral-800 shadow hover:bg-white dark:hover:bg-neutral-700"
        onClick={() => setShowSettings((s) => !s)}
        title="Settings"
        aria-label="Settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neutral-700 dark:text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.57-.905 3.314.839 2.409 2.41a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.065 2.573c.905 1.57-.839 3.314-2.41 2.409a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.065c-1.57.905-3.314-.839-2.409-2.41a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.065-2.573c-.905-1.57.839-3.314 2.41-2.409.98.565 2.19.139 2.572-1.065Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </div>
  );
}

export default App;
