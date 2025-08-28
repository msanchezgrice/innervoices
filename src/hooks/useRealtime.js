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
    onToolCall,
    onImage,
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
      onToolCall: async (name, args, callId) => {
        try {
          if (name === "generate_image") {
            const prompt = String(args?.prompt || "").trim();
            const size = args?.size || (config?.imageDefaultSize || "1024x1024");
            if (!prompt) {
              clientRef.current?.sendToolResult(callId, { error: "missing_prompt" });
              return;
            }
            const resp = await fetch("/api/generate-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt, size })
            });
            if (resp.ok) {
              const data = await resp.json();
              clientRef.current?.sendToolResult(callId, { image_base64: data?.image_base64, prompt, size });
              try { onImage && onImage({ image_base64: data?.image_base64, prompt, size }); } catch {}
            } else {
              const txt = await resp.text();
              clientRef.current?.sendToolResult(callId, { error: "image_generation_failed", detail: txt });
            }
            return;
          }
          // Bubble unknown tools up if provided
          try { onToolCall && onToolCall(name, args, callId); } catch {}
        } catch (e) {
          clientRef.current?.sendToolResult(callId, { error: e?.message || "tool_error" });
        }
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
    const tools = config?.enableRealtimeTools ? [{
      type: "function",
      name: "generate_image",
      description: "Generate an image with the given prompt and optional size.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Detailed image prompt" },
          size: {
            type: "string",
            enum: ["512x512", "1024x1024", "2048x2048"],
            description: "Image size"
          }
        },
        required: ["prompt"]
      }
    }] : undefined;

    client.sendText(text, {
      ...options,
      tools,
      modalities: options.modalities || ["text", "audio"],
      instructions: buildSystemPrompt(config || {}),
    });
  }, [config?.enableRealtimeTools, config?.imageDefaultSize, config?.shipModeEnabled, config?.systemPrompt, config?.personality, config?.tone]);

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
