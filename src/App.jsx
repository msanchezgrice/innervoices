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
import ResponseHistory from "./components/ResponseHistory.jsx";
import { useRouter } from "./hooks/useRouter.js";

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showResponseHistory, setShowResponseHistory] = useState(false);
  const { currentRoute, navigateToApp, navigateToLanding } = useRouter();

  const startFromLanding = () => {
    navigateToApp();
  };

  const showSetupFromLanding = () => {
    const sessionId = navigateToApp();
    setShowSettings(true);
  };

  // Onboarding after landing (only for app routes)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (currentRoute.type === 'landing') return false;
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
  const createNote = useNotesStore((s) => s.createNote);
  const selectNote = useNotesStore((s) => s.selectNote);
  const activeNote = notes.find((n) => n.id === currentId) || null;

  // Auto-create and select the first note so the user can type immediately
  useEffect(() => {
    if ((!notes || notes.length === 0) && !currentId) {
      const id = createNote("Untitled");
      selectNote(id);
    }
  }, []);

  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const orbState = useConfigStore((s) => s.orbState);
  const setOrbState = useConfigStore((s) => s.setOrbState);
  const toggleMute = useConfigStore((s) => s.toggleMute);
  const isActive = useConfigStore((s) => s.isActive);
  const toggleActive = useConfigStore((s) => s.toggleActive);
  const setTrace = useConfigStore((s) => s.setTrace);
  const clearTrace = useConfigStore((s) => s.clearTrace);
  const addResponseToHistory = useConfigStore((s) => s.addResponseToHistory);

  const { speak, cancel, pause, resume, enableAudio, isPaused } = useVoice(config, {
    onStart: () => setOrbState("speaking"),
    onEnd: () => setOrbState("idle"),
    onAutoplayBlocked: () => {
      console.warn("[App] Autoplay blocked; click to enable audio");
      setOrbState("ready");
    }
  });

  useWatcher(activeNote?.content || "", config, {
    onThinking: () => {
      console.log("[App] Watcher triggered - Starting to think", {
        contentLength: activeNote?.content?.length || 0,
        orbState: useConfigStore.getState().orbState,
        isActive: useConfigStore.getState().isActive,
        currentId: currentId,
        activeNoteId: activeNote?.id,
        timestamp: new Date().toISOString()
      });
      
      if (useConfigStore.getState().orbState !== "muted") {
        console.log("[App] Setting orb to thinking state");
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
      console.log("[App] API Start - Orb should be thinking", {
        provider,
        model,
        currentOrbState: useConfigStore.getState().orbState,
        timestamp: new Date().toISOString()
      });
      setTrace((t) => ({ ...t, provider: provider || "", model: model || "", thinking: true }));
    },
    onApiEnd: ({ ok, error, ms }) => {
      console.log("[App] API End", {
        ok,
        error,
        responseTime: ms,
        currentOrbState: useConfigStore.getState().orbState,
        timestamp: new Date().toISOString()
      });
      
      setTrace((t) => ({
        ...t,
        finishedAt: Date.now(),
        thinking: false,
        error: ok ? null : (error || "Unknown API error"),
      }));
      
      if (!ok && useConfigStore.getState().orbState !== "muted") {
        console.log("[App] Setting orb to error state");
        setOrbState("error");
        setTimeout(() => {
          if (useConfigStore.getState().orbState === "error") {
            console.log("[App] Resetting orb from error to idle");
            setOrbState("idle");
          }
        }, 2000);
      }
    },
    onResponse: async (r) => {
      // Get the current noteId from useWatcher's context
      const watcherNoteId = currentId;
      console.log("[App] onResponse called with:", {
        responseLength: r?.length || 0,
        responsePreview: r?.substring(0, 50),
        watcherNoteId: watcherNoteId,
        currentId: currentId,
        activeNoteId: activeNote?.id,
        hasCurrentId: !!currentId,
        timestamp: new Date().toISOString()
      });
      
      setTrace((t) => ({ ...t, response: r || "" }));
      
      if (r && r.trim() && watcherNoteId) {
        const currentTrace = useConfigStore.getState().trace;
        console.log("[App] Adding response to history for note:", watcherNoteId, "model:", currentTrace.model);
        addResponseToHistory(r, currentTrace.model || "Unknown", watcherNoteId);
        
        // Verify it was added
        const updatedHistory = useConfigStore.getState().responseHistory;
        console.log("[App] After adding, history keys:", Object.keys(updatedHistory));
        console.log("[App] Note", watcherNoteId, "now has", updatedHistory[watcherNoteId]?.length || 0, "responses");

        // Detect "IMAGE: <prompt>" in the response and generate an image
        const imageMatch = (r || "").match(/(?:^|\n)IMAGE:\s*(.+)/i);
        if (imageMatch && imageMatch[1]) {
          const imagePrompt = imageMatch[1].trim();

          // Insert a simple text placeholder into the note
          if (activeNote) {
            updateContent(
              activeNote.id,
              (activeNote.content || "") + `\n⏳ Generating image: "${imagePrompt}" …`
            );
          }

          try {
            const resp = await fetch("/api/generate-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: imagePrompt })
            });
            if (resp.ok) {
              const data = await resp.json();
              if (data?.image_base64) {
                useConfigStore.getState().addResponseToHistory(
                  "",
                  currentTrace.model || "Unknown",
                  watcherNoteId,
                  { image_base64: data.image_base64, image_prompt: imagePrompt }
                );
                // Open the Response History panel to show the generated image
                setShowResponseHistory(true);

                // Append ready line to note
                if (activeNote) {
                  updateContent(
                    activeNote.id,
                    (activeNote.content || "") + `\n✅ Image ready for "${imagePrompt}". Open Response History to copy/paste.`
                  );
                }
              }
            } else {
              const txt = await resp.text();
              console.error("[App] Image generation failed:", resp.status, txt);
              // Append failure line to note
              if (activeNote) {
                updateContent(
                  activeNote.id,
                  (activeNote.content || "") + `\n❌ Image generation failed (${resp.status}).`
                );
              }
            }
          } catch (e) {
            console.error("[App] Image generation error:", e);
            // Append error line to note
            if (activeNote) {
              updateContent(
                activeNote.id,
                (activeNote.content || "") + `\n❌ Image generation error.`
              );
            }
          }
        }
      } else {
        console.log("[App] Not adding response to history - missing data:", {
          hasResponse: !!r,
          responseIsEmpty: !r || !r.trim(),
          responseLength: r?.length,
          hasNoteId: !!watcherNoteId,
          noteId: watcherNoteId
        });
      }
    },
    onSystemPrompt: (s) => {
      setTrace((t) => ({ ...t, systemPrompt: s || "" }));
    },
    onMeta: (m) => {
      setTrace((t) => ({ ...t, meta: { ...(t?.meta || {}), ...(m || {}) } }));
    },
    onAudioStart: () => {
      if (useConfigStore.getState().orbState !== "muted") {
        setOrbState("speaking");
      }
    },
    onAudioEnd: () => {
      if (useConfigStore.getState().orbState !== "muted") {
        setOrbState("idle");
      }
    },
    onImageStart: ({ prompt, size } = {}) => {
      // Insert a simple text placeholder into the note
      if (activeNote) {
        updateContent(
          activeNote.id,
          (activeNote.content || "") + `\n⏳ Generating image: "${prompt || ""}" …`
        );
      }
    },
    onImage: ({ image_base64, prompt, size } = {}) => {
      // Append ready line to note and open Response History panel
      if (activeNote) {
        updateContent(
          activeNote.id,
          (activeNote.content || "") + `\n✅ Image ready for "${prompt || ""}". Open Response History to copy/paste.`
        );
      }
      // Auto-open Response History panel to show the generated image
      setShowResponseHistory(true);
    },
    onComment: (commentary) => {
      console.log("[App] Comment received", {
        commentLength: commentary?.length || 0,
        orbState: useConfigStore.getState().orbState,
        voiceEnabled: config.voiceEnabled,
        timestamp: new Date().toISOString()
      });
      
      if (useConfigStore.getState().orbState === "muted") {
        console.log("[App] Orb is muted, skipping comment");
        return;
      }
      
      setOrbState("ready");
      if (config.voiceEnabled && config.ttsProvider === "elevenlabs") {
        console.log("[App] Speaking comment via ElevenLabs TTS");
        speak(commentary);
      }
    },
    onError: (e) => {
      console.error("[App] Error event", {
        error: e?.message || String(e),
        stack: e?.stack,
        orbState: useConfigStore.getState().orbState,
        timestamp: new Date().toISOString()
      });
      
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
    enabled: isActive && currentRoute.type === 'app' && !showOnboarding,
    noteId: currentId,
  });
  
  // Debug logging for note tracking
  useEffect(() => {
    console.log("[App] Note context changed:", {
      currentId,
      activeNoteId: activeNote?.id,
      activeNoteTitle: activeNote?.title,
      notesCount: notes.length,
      timestamp: new Date().toISOString()
    });
  }, [currentId, activeNote?.id]);

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
    // Alt+Click toggles mute
    if (e && e.altKey) {
      toggleMute();
      return;
    }

    // If currently speaking, toggle pause/resume without cancelling the stream
    if (orbState === "speaking") {
      try {
        if (isPaused && isPaused()) {
          resume && resume();
          setOrbState("speaking");
        } else {
          pause && pause();
          // Use "ready" to indicate paused but content available
          setOrbState("ready");
        }
      } catch {}
      return;
    }

    // Try to enable audio on user gesture (fixes autoplay policies)
    try { enableAudio && enableAudio(); } catch {}

    // Click toggles Start/Pause (watcher active)
    toggleActive();
  };

  return (
    <div className="w-screen h-screen flex">
      {currentRoute.type === 'app' && config.showNotes && <NotesSidebar />}
      {currentRoute.type === 'app' && (
        <div className={`flex-1 h-full ${!config.showNotes ? "pl-12" : ""} ${showResponseHistory ? "pr-96" : ""}`}>
          <Notepad
            key={currentId || "notepad"}
            value={activeNote?.content || ""}
            onChange={(v) => activeNote && updateContent(activeNote.id, v)}
          />
        </div>
      )}

      {currentRoute.type === 'app' && <Orb state={orbState} isActive={isActive} onClick={handleOrbClick} />}

      {currentRoute.type === 'app' && showSettings && <Settings />}
      {currentRoute.type === 'app' && showResponseHistory && <ResponseHistory onClose={() => setShowResponseHistory(false)} noteId={currentId} />}
      {currentRoute.type === 'app' && <ThinkingOverlay />}

      {currentRoute.type === 'landing' && (
        <div className="fixed inset-0 z-[100]">
          <Landing onStart={startFromLanding} onShowSetup={showSetupFromLanding} />
        </div>
      )}

      {currentRoute.type === 'app' && showOnboarding && (
        <OnboardingModal
          open
          onSaveOpenAI={handleOnboardingSave}
          onComplete={handleOnboardingComplete}
          onClose={handleOnboardingComplete}
        />
      )}

      {currentRoute.type === 'app' && (
        <>
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
            className="fixed bottom-4 left-4 z-50 text-xs px-3 py-1 border rounded bg-white/80 dark:bg-neutral-800 shadow hover:bg-white dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
            onClick={navigateToLanding}
            title="Back to Landing"
          >
            ← Landing
          </button>
        </>
      )}

      {currentRoute.type === 'app' && (
        <div className="fixed top-4 right-4 z-50 flex gap-2">
        <button
          className="border rounded px-2.5 py-2 bg-white/80 dark:bg-neutral-800 shadow hover:bg-white dark:hover:bg-neutral-700"
          onClick={() => setShowResponseHistory((s) => !s)}
          title="Response History"
          aria-label="Response History"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neutral-700 dark:text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <button
          className="border rounded px-2.5 py-2 bg-white/80 dark:bg-neutral-800 shadow hover:bg-white dark:hover:bg-neutral-700"
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
      )}
    </div>
  );
}

export default App;
