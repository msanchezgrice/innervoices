/**
 * OpenAI Realtime WebRTC Client (browser)
 *
 * Responsibilities:
 * - Fetch ephemeral token via /api/realtime-session
 * - Establish RTCPeerConnection to OpenAI Realtime endpoint
 * - Manage data channel for JSON events (oai-events)
 * - Receive remote audio track (assistant TTS) and auto-play
 * - Expose sendText() to request a response with text/audio modalities
 *
 * Minimal event types handled:
 * - response.output_text.delta
 * - response.output_text.done | response.completed
 * - error
 *
 * References:
 * https://platform.openai.com/docs/guides/realtime#websocket-or-webrtc
 */

export class RealtimeClient {
  constructor(options = {}) {
    this.model =
      options.model ||
      import.meta.env.VITE_OPENAI_REALTIME_MODEL ||
      "gpt-4o-realtime-preview";
    this.voice =
      options.voice ||
      import.meta.env.VITE_OPENAI_REALTIME_VOICE ||
      "alloy";

    // Event callbacks
    this.onTextDelta = options.onTextDelta || (() => {});
    this.onTextDone = options.onTextDone || (() => {});
    this.onAudioStart = options.onAudioStart || (() => {});
    this.onAudioEnd = options.onAudioEnd || (() => {});
    this.onError = options.onError || ((e) => console.error("[Realtime] Error:", e));
    this.onStateChange = options.onStateChange || (() => {});
    this.onToolCall = options.onToolCall || (() => {});
    this.onAutoplayBlocked = options.onAutoplayBlocked || (() => {});
    this.onUserTextDelta = options.onUserTextDelta || (() => {});
    this.onUserTextDone = options.onUserTextDone || (() => {});

    // Runtime
    this._fnCalls = {}; // aggregate function/tool call arguments by call_id
    this.pc = null;
    this.dc = null;
    this.token = null;
    this.systemInstructions = options.instructions || null;
    this.micEnabled = !!options.micEnabled;
    this.autoplayBlocked = false;

    this.audioEl = null;
    this.audioStream = null;
    this.connected = false;
    this.speaking = false;

    // Accumulate text for current response
    this._activeTextBuffer = "";
    // Accumulate transcribed user input text (voice)
    this._activeUserTextBuffer = "";
  }

  _setState(patch) {
    const next = { connected: this.connected, speaking: this.speaking, ...patch };
    this.connected = !!next.connected;
    this.speaking = !!next.speaking;
    try {
      this.onStateChange({ connected: this.connected, speaking: this.speaking });
    } catch {}
  }

  async connect({ micEnabled, instructions, model, voice } = {}) {
    if (this.connected) return;
    if (typeof micEnabled === "boolean") this.micEnabled = micEnabled;
    if (instructions) this.systemInstructions = instructions;
    if (model) this.model = model;
    if (voice) this.voice = voice;

    // 1) Get ephemeral client secret from our server
    let session;
    try {
      const resp = await fetch("/api/realtime-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.model, voice: this.voice }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Failed to create realtime session: ${resp.status} ${text}`);
      }
      session = await resp.json();
    } catch (e) {
      this.onError(e);
      throw e;
    }

    this.token = session?.client_secret?.value;
    if (!this.token) {
      const e = new Error("Invalid realtime session: missing client_secret.value");
      this.onError(e);
      throw e;
    }

    // 2) Create RTCPeerConnection and DataChannel
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    });
    this.pc = pc;

    // Upstream mic track (optional)
    if (this.micEnabled) {
      try {
        const media = await navigator.mediaDevices.getUserMedia({ audio: true });
        for (const track of media.getTracks()) {
          pc.addTrack(track, media);
        }
      } catch (e) {
        console.warn("[Realtime] Failed to get mic:", e);
      }
    }

    // Downstream audio track (assistant TTS)
    pc.addTransceiver("audio", { direction: "recvonly" });
    pc.ontrack = (e) => {
      const [remoteStream] = e.streams;
      this.audioStream = remoteStream;
      if (!this.audioEl) {
        this.audioEl = new Audio();
        this.audioEl.autoplay = true;
        this.audioEl.playsInline = true;
        this.audioEl.preload = "auto";

        this.audioEl.addEventListener("playing", () => {
          this._setState({ speaking: true });
          try { this.onAudioStart(); } catch {}
        });
        const onAudioEnded = () => {
          this._setState({ speaking: false });
          try { this.onAudioEnd(); } catch {}
        };
        this.audioEl.addEventListener("ended", onAudioEnded);
        this.audioEl.addEventListener("pause", onAudioEnded);
      }
      this.audioEl.srcObject = remoteStream;
      // Attempt to play (may require user gesture depending on browser policy)
      this.audioEl.play().catch((err) => {
        console.warn("[Realtime] Autoplay prevented:", err?.message || err);
        this.autoplayBlocked = true;
        try { this.onAutoplayBlocked(); } catch {}
      });
    };

    // Data channel for JSON events
    const dc = pc.createDataChannel("oai-events");
    this.dc = dc;

    // Promise that resolves when the DC is open
    this._whenOpen = new Promise((resolve) => {
      if (dc.readyState === "open") {
        resolve();
      } else {
        const prev = dc.onopen;
        dc.onopen = (...args) => {
          try { typeof prev === "function" && prev(...args); } catch {}
          resolve();
        };
      }
    });

    dc.onmessage = (evt) => this._handleDataEvent(evt);
    dc.onopen = () => {
      // connection open after SDP exchange completes
    };
    dc.onerror = (err) => {
      this.onError(err);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        this._setState({ connected: true });
      } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected" || pc.connectionState === "closed") {
        this._setState({ connected: false, speaking: false });
      }
    };

    // 3) Create and set local SDP offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // 4) Send SDP to OpenAI Realtime endpoint, get answer
    const url = `https://api.openai.com/v1/realtime?model=${encodeURIComponent(this.model)}`;
    let answerSDP;
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/sdp",
          "OpenAI-Beta": "realtime=v1",
        },
        body: offer.sdp,
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Realtime SDP exchange failed: ${resp.status} ${text}`);
      }
      answerSDP = await resp.text();
    } catch (e) {
      this.onError(e);
      throw e;
    }

    await pc.setRemoteDescription({ type: "answer", sdp: answerSDP });
    // Wait for data channel to be open before resolving connect()
    try { await this.whenOpen(10000); } catch (e) { this.onError(e); }

    // Optional: set session-level instructions after connect (if needed)
    if (this.systemInstructions) {
      // Not standardized; we send per-response via response.create.instructions
    }

    this._setState({ connected: true });
  }

  /**
   * Sends a response request with input_text and optional modalities.
   * Defaults to both text and audio output so audio will play via remote track.
   */
  sendText(text, options = {}) {
    if (!this.dc || this.dc.readyState !== "open") {
      // Wait for the DC to open (up to 10s) before failing
      return this.whenOpen(10000).then(() => this.sendText(text, options)).catch((err) => {
        this.onError(err);
        throw err;
      });
    }
    const instructions = options.instructions || this.systemInstructions || undefined;
    const modalities = options.modalities || ["text", "audio"];
    const tools = Array.isArray(options.tools) ? options.tools : undefined;

    // Reset active buffer for a new response
    this._activeTextBuffer = "";

    const event = {
      type: "response.create",
      response: {
        ...(instructions ? { instructions } : {}),
        modalities,
        ...(tools && tools.length ? { tools, tool_choice: "auto" } : {}),
        // Realtime expects a flat input array of input_* items
        input: [
          { type: "input_text", text: String(text || "") }
        ],
      },
    };

    try {
      this.dc.send(JSON.stringify(event));
    } catch (e) {
      this.onError(e);
      throw e;
    }
  }

  /**
   * Add a user message (input_text) to the conversation without triggering a response.
   * Useful for periodically ingesting the user's note content so the assistant has context.
   */
  addUserText(text) {
    if (!this.dc || this.dc.readyState !== "open") return;
    try {
      this.dc.send(JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: String(text || "") }]
        }
      }));
    } catch (e) {
      this.onError(e);
    }
  }

  /**
   * Wait until the data channel is open.
   */
  whenOpen(timeoutMs = 10000) {
    if (this.dc && this.dc.readyState === "open") return Promise.resolve();
    const base = this._whenOpen instanceof Promise ? this._whenOpen : Promise.reject(new Error("No data channel"));
    if (!timeoutMs) return base;
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("Data channel open timeout")), timeoutMs);
      base.then(() => { clearTimeout(t); resolve(); }).catch((e) => { clearTimeout(t); reject(e); });
    });
  }

  /**
   * Send tool result back to the conversation and continue the response.
   */
  sendToolResult(callId, result) {
    if (!this.dc || this.dc.readyState !== "open") return;
    try {
      // Provide function/tool output tied to a specific call_id
      this.dc.send(JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output: JSON.stringify(result ?? {})
        }
      }));
      // Ask the model to continue now that the tool output is available
      this.dc.send(JSON.stringify({ type: "response.create" }));
    } catch (e) {
      this.onError(e);
    }
  }

  /**
   * Cancel current/ongoing response if the protocol supports it.
   * Many implementations accept a "response.cancel" event; we send a generic one.
   */
  cancel() {
    if (this.dc && this.dc.readyState === "open") {
      try {
        this.dc.send(JSON.stringify({ type: "response.cancel" }));
      } catch {}
    }
    // Also stop audio if playing
    try {
      if (this.audioEl) {
        this.audioEl.pause();
      }
    } catch {}
    this._setState({ speaking: false });
  }

  // Pause only the local audio playback (stream continues)
  pause() {
    try {
      if (this.audioEl) {
        this.audioEl.pause();
      }
    } catch {}
  }

  // Resume local audio playback; will re-trigger autoplay blocked if policy forbids
  resume() {
    if (this.audioEl) {
      this.audioEl.play().catch((err) => {
        console.warn("[Realtime] Resume blocked:", err?.message || err);
        this.autoplayBlocked = true;
        try { this.onAutoplayBlocked(); } catch {}
      });
    }
  }

  // Attempt to enable audio after a user gesture (fixes autoplay policy)
  enableAudio() {
    if (this.audioEl) {
      this.audioEl.muted = false;
      this.audioEl.play().then(() => {
        this.autoplayBlocked = false;
      }).catch((err) => {
        console.warn("[Realtime] enableAudio failed:", err?.message || err);
        this.autoplayBlocked = true;
        try { this.onAutoplayBlocked(); } catch {}
      });
    }
  }

  isPaused() {
    return !!this.audioEl && this.audioEl.paused;
  }

  setSystemPrompt(instructions) {
    this.systemInstructions = instructions || null;
  }

  setVoice(voice) {
    // Voice is fixed on session creation. To apply a new voice, reconnect.
    this.voice = voice || this.voice;
  }

  async disconnect() {
    try {
      if (this.dc) {
        try { this.dc.close(); } catch {}
        this.dc = null;
      }
      if (this.pc) {
        try { this.pc.close(); } catch {}
        this.pc = null;
      }
      if (this.audioEl) {
        try {
          this.audioEl.pause();
          this.audioEl.srcObject = null;
        } catch {}
      }
      if (this.audioStream) {
        try {
          this.audioStream.getTracks().forEach((t) => t.stop());
        } catch {}
        this.audioStream = null;
      }
    } finally {
      this._setState({ connected: false, speaking: false });
    }
  }

  _handleDataEvent(evt) {
    let msg;
    try {
      msg = JSON.parse(evt.data);
    } catch {
      // ignore non-JSON messages
      return;
    }

    const type = msg?.type || "";

    // User input text streaming (transcription) variants
    if (type === "response.input_text.delta" || type === "input_text.delta") {
      const piece = typeof msg.delta === "string" ? msg.delta : (msg.delta?.text ?? "");
      if (piece) {
        this._activeUserTextBuffer += piece;
        try { this.onUserTextDelta(piece, this._activeUserTextBuffer); } catch {}
        return;
      }
    }
    if (type === "response.delta" && msg.delta && typeof msg.delta === "object") {
      const d = msg.delta;
      if (d.type === "input_text.delta") {
        const piece = typeof d.text === "string" ? d.text : "";
        if (piece) {
          this._activeUserTextBuffer += piece;
          try { this.onUserTextDelta(piece, this._activeUserTextBuffer); } catch {}
          return;
        }
      }
    }
    if (
      type === "response.input_text.done" ||
      type === "input_text.done" ||
      (type === "response.delta" && msg.delta && typeof msg.delta === "object" && msg.delta.type === "input_text.done")
    ) {
      const finalUser = this._activeUserTextBuffer;
      this._activeUserTextBuffer = "";
      try { this.onUserTextDone(finalUser); } catch {}
      return;
    }

    // Text streaming (handle multiple delta event variants and nested payloads)
    // 1) Direct output_text/text delta with string or nested { text }
    if (type === "response.output_text.delta" || type === "response.text.delta") {
      const piece = typeof msg.delta === "string" ? msg.delta : (msg.delta?.text ?? "");
      if (piece) {
        this._activeTextBuffer += piece;
        try { this.onTextDelta(piece, this._activeTextBuffer); } catch {}
        return;
      }
    }
    // 2) Generic response.delta with nested shape: { delta: { type: "output_text.delta", text: "..." } }
    if (type === "response.delta" && msg.delta && typeof msg.delta === "object") {
      const d = msg.delta;
      if (d.type === "output_text.delta") {
        const piece = typeof d.text === "string" ? d.text : "";
        if (piece) {
          this._activeTextBuffer += piece;
          try { this.onTextDelta(piece, this._activeTextBuffer); } catch {}
          return;
        }
      }
    }

    if (
      type === "response.output_text.done" ||
      type === "response.text.done" ||
      type === "response.completed" ||
      (type === "response.delta" && msg.delta && typeof msg.delta === "object" && msg.delta.type === "output_text.done")
    ) {
      const finalText = this._activeTextBuffer;
      this._activeTextBuffer = "";
      try { this.onTextDone(finalText); } catch {}
      return;
    }

    // Audio lifecycle markers (names vary; handle generically)
    if (type === "response.output_audio.started") {
      this._setState({ speaking: true });
      try { this.onAudioStart(); } catch {}
      return;
    }
    if (type === "response.output_audio.completed") {
      this._setState({ speaking: false });
      try { this.onAudioEnd(); } catch {}
      return;
    }

    // Function/tool call arguments streaming (aggregate per call_id)
    if (type === "response.function_call_arguments.delta") {
      const callId = msg.call_id || msg.id;
      if (callId) {
        const current = this._fnCalls[callId] || { name: msg.name || "", argsText: "" };
        current.name = msg.name || current.name || "";
        current.argsText = (current.argsText || "") + (msg.delta || "");
        this._fnCalls[callId] = current;
      }
      return;
    }
    if (type === "response.function_call_arguments.done") {
      const callId = msg.call_id || msg.id;
      const rec = callId ? this._fnCalls[callId] : null;
      if (rec) {
        let parsed = {};
        try { parsed = rec.argsText ? JSON.parse(rec.argsText) : {}; } catch {}
        try { this.onToolCall && this.onToolCall(rec.name || msg.name || "", parsed, callId); } catch {}
        delete this._fnCalls[callId];
      }
      return;
    }

    if (type === "error" || msg?.error) {
      try { this.onError(msg.error || msg); } catch {}
      return;
    }

    // Other events (tool calls, images) can be handled later
    // console.debug("[Realtime] Event:", msg);
  }
}
