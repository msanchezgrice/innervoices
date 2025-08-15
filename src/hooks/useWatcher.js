import { useEffect, useRef } from "react";
import { analyzeText } from "../services/ai";
import { useConfigStore } from "../store/useConfigStore";

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
    enabled = true,
  } = {}
) {
  const textRef = useRef(text || "");
  const lastTypedAtRef = useRef(Date.now());
  const lastCommentAtRef = useRef(0);
  const lastSnapshotRef = useRef("");
  const runningRef = useRef(false);
  const enabledRef = useRef(Boolean(enabled));

  // track latest text
  useEffect(() => {
    textRef.current = text || "";
    lastTypedAtRef.current = Date.now();
  }, [text]);

  // track enabled flag
  useEffect(() => {
    enabledRef.current = Boolean(enabled);
  }, [enabled]);

  useEffect(() => {
    const WATCH_INTERVAL = Number(config?.watchInterval ?? 5000);
    const COMMENT_INTERVAL = Number(config?.commentInterval ?? 10000);
    const COMMENT_PROB = Number(config?.commentProbability ?? 0.3);

    const handleTick = async () => {
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

        // Get response history from store for memory
        const responseHistory = useConfigStore.getState().responseHistory || [];
        
        // Call AI
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
        if (commentary && typeof onComment === "function") {
          onComment(commentary);
          lastCommentAtRef.current = Date.now();
          lastSnapshotRef.current = currentText;
        }
      } catch (e) {
        // Swallow errors; the AI service already logs warnings.
        onError && onError(e);
      } finally {
        runningRef.current = false;
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
  ]);
}
