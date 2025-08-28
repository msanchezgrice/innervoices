import { useEffect, useRef } from "react";
import { analyzeText } from "../services/ai";
import { useConfigStore } from "../store/useConfigStore";
import { useRealtime } from "./useRealtime.js";
import { buildPrompt } from "../config/prompts.js";
import { detectContext } from "../utils/detectContext.js";

/**
 * Watches the user's text and triggers AI commentary periodically.
 *
 * Usage:
 * useWatcher(text, config, {
 *   onThinking: () => {},       // optional: called before calling AI
 *   onComment: (comment) => {}, // required: called with AI commentary string
 *   enabled: true               // optional: watcher active flag (default true)
 * });
 */
export function useWatcher(
  text,
  config,
  {
    onThinking,
    onComment,
    onToolStart,
    onToolEnd,
    onError,
    onPrompt,
    onApiStart,
    onApiEnd,
    onResponse,
    onSystemPrompt,
    onMeta,
    onAudioStart,
    onAudioEnd,
    onImageStart,
    onImage,
    enabled = true,
    noteId = null,
  } = {}
) {
  const textRef = useRef(text || "");
  const lastTypedAtRef = useRef(Date.now());
  const lastCommentAtRef = useRef(0);
  const lastSnapshotRef = useRef("");
  const runningRef = useRef(false);
  const enabledRef = useRef(Boolean(enabled));
  const noteIdRef = useRef(noteId);
  const pendingResolveRef = useRef(null);

  // Realtime session (used when aiProvider === "openai-realtime")
  const realtime = useRealtime(config, {
    onTextDelta: (delta, full) => {
      try {
        useConfigStore.getState().setTrace({ response: full || "" });
      } catch {}
    },
    onTextDone: (finalText) => {
      // Bubble text to caller and trigger comment
      try {
        if (typeof onResponse === "function") onResponse(finalText);
      } catch {}
      try {
        if (typeof onComment === "function" && finalText) onComment(finalText);
      } catch {}
      lastCommentAtRef.current = Date.now();

      // Resolve any pending waiters
      const fn = pendingResolveRef.current;
      pendingResolveRef.current = null;
      if (typeof fn === "function") {
        try { fn(); } catch {}
      }
    },
    onImageStart: ({ prompt, size }) => {
      try {
        if (typeof onImageStart === "function") onImageStart({ prompt, size });
      } catch {}
    },
    onImage: ({ image_base64, prompt }) => {
      // When tool-based image returns, push it to history for the current note
      try {
        const currentNoteId = noteIdRef.current;
        const trace = useConfigStore.getState().trace;
        if (currentNoteId && image_base64) {
          useConfigStore.getState().addResponseToHistory(
            "",
            trace.model || "Unknown",
            currentNoteId,
            { image_base64, image_prompt: prompt }
          );
          // Bubble up to caller (e.g., App) so it can open the history panel
          try { typeof onImage === "function" && onImage({ image_base64, prompt }); } catch {}
        }
      } catch {}
    },
    onAudioStart: () => {
      try {
        if (typeof onAudioStart === "function") onAudioStart();
      } catch {}
    },
    onAudioEnd: () => {
      try {
        if (typeof onAudioEnd === "function") onAudioEnd();
      } catch {}
    },
    onError: (e) => {
      try {
        if (typeof onError === "function") onError(e);
      } catch {}
      const fn = pendingResolveRef.current;
      pendingResolveRef.current = null;
      if (typeof fn === "function") {
        try { fn(); } catch {}
      }
    },
  });

  // track latest text
  useEffect(() => {
    textRef.current = text || "";
    lastTypedAtRef.current = Date.now();
  }, [text]);

  // track enabled flag
  useEffect(() => {
    enabledRef.current = Boolean(enabled);
  }, [enabled]);
  
  // track noteId
  useEffect(() => {
    noteIdRef.current = noteId;
    console.log("[Watcher] noteId updated to:", noteId);
  }, [noteId]);
  
  // Eagerly connect/disconnect realtime on enable toggles
  useEffect(() => {
    (async () => {
      try {
        if (Boolean(enabled)) {
          // reset snapshot so ingestion can re-trigger
          lastSnapshotRef.current = "";
          await realtime.connect({ micEnabled: !!config?.realtimeMicEnabled });
        } else {
          try { realtime.cancel && realtime.cancel(); } catch {}
          try { await realtime.disconnect?.(); } catch {}
          pendingResolveRef.current = null;
          runningRef.current = false;
        }
      } catch (e) {
        try { typeof onError === "function" && onError(e); } catch {}
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Reconnect when mic toggle changes while enabled
  useEffect(() => {
    (async () => {
      if (!enabledRef.current) return;
      try {
        await realtime.disconnect?.();
      } catch {}
      try {
        await realtime.connect({ micEnabled: !!config?.realtimeMicEnabled });
      } catch (e) {
        try { typeof onError === "function" && onError(e); } catch {}
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.realtimeMicEnabled]);
  
  useEffect(() => {
    const WATCH_INTERVAL = Number(config?.watchInterval ?? 5000);
    const COMMENT_INTERVAL = Number(config?.commentInterval ?? 10000);
    const COMMENT_PROB = Number(config?.commentProbability ?? 0.3);

    const handleTick = async () => {
      const provider = String(config?.aiProvider || "").toLowerCase();
      const tts = String(config?.ttsProvider || "").toLowerCase();
      const shouldUseRealtime = provider === "openai-realtime" || tts === "openai-realtime";
      if (!enabledRef.current) return;
      if (runningRef.current) return;

      const now = Date.now();
      const sinceLastType = now - lastTypedAtRef.current;
      const sinceLastComment = now - lastCommentAtRef.current;

      const currentText = textRef.current.trim();

      // Basic guards
      if (!currentText) return;
      if (sinceLastType < 1200) return; // avoid commenting during rapid typing
      if (sinceLastComment < COMMENT_INTERVAL) return;
      if (currentText === lastSnapshotRef.current) return; // no change since last commentary

      // probability gate
      if (Math.random() > COMMENT_PROB) return;

      try {
        runningRef.current = true;
        onThinking && onThinking();

        // Get response history from store for memory (note-specific)
        const currentNoteId = noteIdRef.current;
        const getResponseHistoryForNote = useConfigStore.getState().getResponseHistoryForNote;
        const responseHistory = currentNoteId ? getResponseHistoryForNote(currentNoteId) : [];
        console.log("[Watcher] Analysis starting:", {
          noteId: currentNoteId,
          hasNoteId: !!currentNoteId,
          responseHistoryLength: responseHistory.length,
          textLength: currentText.length,
          provider,
          timestamp: new Date().toISOString()
        });
        console.log("[Watcher] Mode", {
          mode: shouldUseRealtime ? "realtime" : "responses",
          realtimeModel: config?.openaiRealtimeModel,
          realtimeVoice: config?.openaiRealtimeVoice,
          ttsProvider: tts
        });

        if (shouldUseRealtime) {
          // Build prompt with context + history
          const ctx = detectContext(currentText);
          const composed = buildPrompt(currentText, config, ctx, responseHistory);

          onPrompt && onPrompt(composed);

          const t0 = Date.now();
          onApiStart && onApiStart({
            provider: "openai-realtime",
            model: realtime?.model || (config?.openaiRealtimeModel || "gpt-4o-realtime-preview"),
            promptLength: composed.length
          });

          try {
            // Ensure connection
            await realtime.connect({ micEnabled: !!config?.realtimeMicEnabled });
          } catch (e) {
            // If realtime connect fails, surface error and bail this tick
            onApiEnd && onApiEnd({ provider: "openai-realtime", model: realtime?.model, ms: 0, ok: false, error: e?.message || String(e) });
            throw e;
          }

          // Wait for completion via onTextDone handler
          await new Promise((resolve) => {
            pendingResolveRef.current = resolve;
            try {
              realtime.sendText(composed, { modalities: ["text", "audio"] });
            } catch (e) {
              // immediate send failure - resolve and rethrow
              pendingResolveRef.current = null;
              resolve();
              throw e;
            }
          });

          const ms = Date.now() - t0;
          onApiEnd && onApiEnd({ provider: "openai-realtime", model: realtime?.model, ms, ok: true });

          // ALWAYS update snapshot to prevent infinite loop
          lastSnapshotRef.current = currentText;
        } else {
          // Legacy path: Responses/Anthropic
          const commentary = await analyzeText(currentText, config, {
            onToolStart: () => onToolStart && onToolStart(),
            onToolEnd: () => onToolEnd && onToolEnd(),
            onPrompt: (p) => onPrompt && onPrompt(p),
            onApiStart: (meta) => onApiStart && onApiStart(meta),
            onApiEnd: (meta) => onApiEnd && onApiEnd(meta),
            onResponse: (r) => onResponse && onResponse(r),
            onSystemPrompt: (s) => onSystemPrompt && onSystemPrompt(s),
            onMeta: (m) => onMeta && onMeta(m),
          }, responseHistory);
          
          // ALWAYS update snapshot to prevent infinite loop
          lastSnapshotRef.current = currentText;
          
          if (commentary && typeof onComment === "function") {
            console.log("[Watcher] Commentary generated:", commentary?.substring(0, 100) + "...");
            onComment(commentary);
            lastCommentAtRef.current = Date.now();
          } else {
            console.log("[Watcher] No commentary generated or no onComment handler");
            // Still update last comment time to prevent rapid retries
            lastCommentAtRef.current = Date.now();
          }
        }
      } catch (e) {
        console.error("[Watcher] Analysis error:", {
          error: e?.message || String(e),
          stack: e?.stack,
          timestamp: new Date().toISOString()
        });
        onError && onError(e);
      } finally {
        runningRef.current = false;
        console.log("[Watcher] Analysis complete");
      }
    };

    const id = setInterval(handleTick, WATCH_INTERVAL);
    return () => clearInterval(id);
  }, [
    config?.watchInterval,
    config?.commentInterval,
    config?.commentProbability,
    config?.creativity,
    config?.maxCommentLength,
    enabled,
    noteId,
  ]);
}
