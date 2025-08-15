import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useConfigStore } from "../store/useConfigStore";

/**
 * Draggable overlay to show thinking/tool traces.
 * Persists position in config.overlayPosition. Visibility toggled by config.showTraceOverlay.
 */
export default function ThinkingOverlay() {
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const trace = useConfigStore((s) => s.trace);
  const [pos, setPos] = useState(config.overlayPosition || null);
  const posRef = useRef(config.overlayPosition || null);
  const ref = useRef(null);
  const startRef = useRef({ mouseX: 0, mouseY: 0, x: 16, y: 16 });
  const [dragging, setDragging] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const next = config.overlayPosition || null;
    setPos(next);
    posRef.current = next;
  }, [config.overlayPosition]);

  const beginDrag = (clientX, clientY) => {
    const rect = ref.current?.getBoundingClientRect();
    const currX = pos?.x ?? (rect ? rect.left : 16);
    const currY = pos?.y ?? (rect ? rect.top : 16);
    startRef.current = { mouseX: clientX, mouseY: clientY, x: currX, y: currY };
    setDragging(true);

    const onMove = (e) => {
      const mx = e.touches ? e.touches[0].clientX : e.clientX;
      const my = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = mx - startRef.current.mouseX;
      const dy = my - startRef.current.mouseY;

      const el = ref.current;
      const w = el?.offsetWidth ?? 320;
      const h = el?.offsetHeight ?? 160;
      const margin = 8;
      const maxX = Math.max(0, (window.innerWidth || 0) - w - margin);
      const maxY = Math.max(0, (window.innerHeight || 0) - h - margin);
      const nextX = Math.min(maxX, Math.max(margin, startRef.current.x + dx));
      const nextY = Math.min(maxY, Math.max(margin, startRef.current.y + dy));
      const next = { x: nextX, y: nextY };
      setPos(next);
      posRef.current = next;
    };

    const onUp = () => {
      setDragging(false);
      const latest = posRef.current;
      if (latest) updateConfig({ overlayPosition: latest });
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
      window.removeEventListener("touchcancel", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    window.addEventListener("touchcancel", onUp);
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    beginDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    beginDrag(t.clientX, t.clientY);
  };

  // Hidden if disabled
  if (!config.showTraceOverlay) return null;

  const containerCls = clsx(
    "fixed z-40 select-none rounded-md border text-xs shadow-lg backdrop-blur",
    "bg-white/90 dark:bg-neutral-900/90 border-neutral-200 dark:border-neutral-800"
  );
  const style =
    pos && typeof pos.x === "number" && typeof pos.y === "number"
      ? { left: `${pos.x}px`, top: `${pos.y}px` }
      : { left: 16, bottom: 16 };

  const status = trace.error
    ? "error"
    : trace.tooling
    ? "tooling"
    : trace.thinking
    ? "thinking"
    : "idle";

  const statusBadgeCls = {
    idle: "bg-gray-200 text-gray-800 dark:bg-neutral-800 dark:text-neutral-300",
    thinking: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    tooling: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
    error: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  }[status];

  return (
    <div ref={ref} className={containerCls} style={style}>
      <div
        className={clsx(
          "cursor-move px-3 py-2",
          collapsed ? "rounded-md" : "rounded-t-md",
          "bg-neutral-100/70 dark:bg-neutral-800/70"
        )}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              className="text-[10px] hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 rounded p-0.5"
              onClick={(e) => {
                e.stopPropagation();
                setCollapsed(!collapsed);
              }}
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? "▶" : "▼"}
            </button>
            <div className="font-semibold">
              Trace
            </div>
          </div>
          <div
            className={clsx("px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide", statusBadgeCls)}
            title={`Provider: ${trace.provider || "-"}  Model: ${trace.model || "-"}`}
          >
            {status}
          </div>
        </div>
        {dragging && <div className="text-[10px] text-neutral-500 mt-1">Dragging…</div>}
      </div>

      {collapsed ? (
        <div className="px-3 py-2 max-w-[420px]">
          <div className="mb-2">
            <div className="text-[10px] text-neutral-500">Response</div>
            <pre className="whitespace-pre-wrap text-[11px] bg-neutral-50 dark:bg-neutral-800/60 p-2 rounded border border-neutral-200 dark:border-neutral-700 max-h-[100px] overflow-auto">
              {trace.response || "-"}
            </pre>
          </div>
        </div>
      ) : (
        <div className="px-3 py-2 max-w-[420px] max-h-[40vh] overflow-auto">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <div className="text-[10px] text-neutral-500">Provider</div>
              <div>{trace.provider || "-"}</div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-500">Model</div>
              <div>{trace.model || "-"}</div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-500">Started</div>
              <div>{trace.startedAt ? new Date(trace.startedAt).toLocaleTimeString() : "-"}</div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-500">Finished</div>
              <div>{trace.finishedAt ? new Date(trace.finishedAt).toLocaleTimeString() : "-"}</div>
            </div>
          </div>

          {/* System Prompt */}
          <div className="mb-2">
            <div className="text-[10px] text-neutral-500">System Prompt</div>
            <pre className="whitespace-pre-wrap text-[11px] bg-neutral-50 dark:bg-neutral-800/60 p-2 rounded border border-neutral-200 dark:border-neutral-700">
              {trace.systemPrompt || "-"}
            </pre>
          </div>

          {/* Variables */}
          <div className="mb-2">
            <div className="text-[10px] text-neutral-500">Variables</div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-neutral-500">Personality</span>: {trace.meta?.personality || "-"}
              </div>
              <div>
                <span className="text-neutral-500">Tone</span>: {trace.meta?.tone || "-"}
              </div>
              <div>
                <span className="text-neutral-500">Creativity</span>: {trace.meta?.creativity ?? "-"}
              </div>
              <div>
                <span className="text-neutral-500">Max Tokens</span>: {trace.meta?.maxTokens ?? "-"}
              </div>
              <div>
                <span className="text-neutral-500">Comment Interval</span>: {trace.meta?.commentInterval ?? "-"}
              </div>
              <div>
                <span className="text-neutral-500">Comment Probability</span>: {trace.meta?.commentProbability ?? "-"}
              </div>
            </div>
          </div>

          <div className="mb-2">
            <div className="text-[10px] text-neutral-500">Prompt</div>
            <pre className="whitespace-pre-wrap text-[11px] bg-neutral-50 dark:bg-neutral-800/60 p-2 rounded border border-neutral-200 dark:border-neutral-700">
              {trace.prompt || "-"}
            </pre>
          </div>

          <div className="mb-2">
            <div className="text-[10px] text-neutral-500">Response</div>
            <pre className="whitespace-pre-wrap text-[11px] bg-neutral-50 dark:bg-neutral-800/60 p-2 rounded border border-neutral-200 dark:border-neutral-700">
              {trace.response || "-"}
            </pre>
          </div>

          {trace.error && (
            <div className="text-[11px] text-red-600 dark:text-red-400">
              Error: {String(trace.error)}
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            <button
              className="text-[11px] px-2 py-1 border rounded bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700"
              onClick={() => setCollapsed(true)}
            >
              Minimize
            </button>
            <button
              className="text-[11px] px-2 py-1 border rounded bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700"
              onClick={() => updateConfig({ overlayPosition: null })}
              title="Reset position to default"
            >
              Reset position
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
