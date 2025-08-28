import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RealtimeClient } from "../services/realtime/client";
import { buildSystemPrompt } from "../config/prompts";

/**
 * React hook wrapper around RealtimeClient.
 *
 * Responsibilities:
 * - Maintain a single RealtimeClient instance per hook usage
 * - Expose connect/disconnect/sendText/cancel
 * - Bubble up key events (text/audio/errors/state)
 * - Auto-derive instructions from config via buildSystemPrompt
 */
export function useRealtime(config, handlers = {}) {
  const {
    onTextDelta,
    onTextDone,
    onAudioStart,
    onAudioEnd,
    onError,
    onStateChange,
  } = handlers;

  const [connected, setConnected] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const clientRef = useRef(null);

  const model = useMemo(
    () => config?.openaiRealtimeModel || import.meta.env.VITE_OPENAI_REALTIME_MODEL || "gpt-4o-realtime-preview",
    [config?.openaiRealtimeModel]
  );
  const voice = useMemo(
    () => config?.openaiRealtimeVoice || import.meta.env.VITE_OPENAI_REALTIME_VOICE || "alloy",
    [config?.openaiRealtimeVoice]
  );

  // Lazily create client
  if (!clientRef.current) {
    clientRef.current = new RealtimeClient({
      model,
      voice,
      instructions: buildSystemPrompt(config || {}),
      onTextDelta: (d, full) => {
        try { onTextDelta && onTextDelta(d, full); } catch {}
      },
      onTextDone: (t) => {
        try { onTextDone && onTextDone(t); } catch {}
      },
      onAudioStart: () => {
        setSpeaking(true);
        try { onAudioStart && onAudioStart(); } catch {}
      },
      onAudioEnd: () => {
        setSpeaking(false);
        try { onAudioEnd && onAudioEnd(); } catch {}
      },
      onError: (e) => {
        try { onError && onError(e); } catch {}
      },
      onStateChange: (s) => {
        setConnected(!!s?.connected);
        setSpeaking(!!s?.speaking);
        try { onStateChange && onStateChange(s); } catch {}
      },
    });
  }

  // Keep model/voice/instructions in sync on changes
  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;
    client.setSystemPrompt(buildSystemPrompt(config || {}));
    // Voice change requires reconnect to take effect (documented in client)
    // We leave that to the caller to decide when to reconnect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.shipModeEnabled, config?.systemPrompt, config?.personality, config?.tone]);

  const connect = useCallback(async (opts = {}) => {
    const client = clientRef.current;
    if (!client) return;
    await client.connect({
      micEnabled: !!opts.micEnabled,
      model,
      voice,
      instructions: buildSystemPrompt(config || {}),
    });
  }, [config, model, voice]);

  const disconnect = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    await client.disconnect();
  }, []);

  const sendText = useCallback((text, options = {}) => {
    const client = clientRef.current;
    if (!client) throw new Error("Realtime client not initialized");
    client.sendText(text, options);
  }, []);

  const cancel = useCallback(() => {
    const client = clientRef.current;
    if (!client) return;
    client.cancel();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        clientRef.current?.disconnect?.();
      } catch {}
    };
  }, []);

  return {
    client: clientRef.current,
    connect,
    disconnect,
    sendText,
    cancel,
    connected,
    speaking,
    model,
    voice,
  };
}
