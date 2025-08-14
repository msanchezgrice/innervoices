import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useConfigStore } from "../store/useConfigStore";

/**
 * Orb states:
 * idle | thinking | tooling | ready | speaking | muted | error
 */
export default function Orb({ state = "idle", isActive = true, onClick }) {
  const { config, updateConfig } = useConfigStore();
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState(config.orbPosition || null);
  const posRef = useRef(config.orbPosition || null);
  const orbRef = useRef(null);
  const startRef = useRef({ mouseX: 0, mouseY: 0, x: 0, y: 0 });

  useEffect(() => {
    const next = config.orbPosition || null;
    setPos(next);
    posRef.current = next;
  }, [config.orbPosition]);

  const beginDrag = (clientX, clientY) => {
    const rect = orbRef.current?.getBoundingClientRect();
    const currX = pos?.x ?? (rect ? rect.left : 0);
    const currY = pos?.y ?? (rect ? rect.top : 0);
    startRef.current = { mouseX: clientX, mouseY: clientY, x: currX, y: currY };
    setDragging(true);

    const onMove = (e) => {
      const mx = e.touches ? e.touches[0].clientX : e.clientX;
      const my = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = mx - startRef.current.mouseX;
      const dy = my - startRef.current.mouseY;

      const el = orbRef.current;
      const w = el?.offsetWidth ?? 64;
      const h = el?.offsetHeight ?? 64;

      const margin = 8; // keep a small inset from edges
      const maxX = Math.max(0, (window.innerWidth || 0) - w - margin);
      const maxY = Math.max(0, (window.innerHeight || 0) - h - margin);
      const nextX = Math.min(maxX, Math.max(margin, startRef.current.x + dx));
      const nextY = Math.min(maxY, Math.max(margin, startRef.current.y + dy));

      setPos({ x: nextX, y: nextY });
      posRef.current = { x: nextX, y: nextY };
    };

    const onUp = () => {
      setDragging(false);
      // persist position using latest ref
      const latestPos = posRef.current;
      if (latestPos) {
        updateConfig({ orbPosition: latestPos });
      } else {
        // if position not yet set, read from current rect
        const rect2 = orbRef.current?.getBoundingClientRect();
        if (rect2) {
          updateConfig({ orbPosition: { x: rect2.left, y: rect2.top } });
        }
      }
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
    // Only left button drags
    if (e.button !== 0) return;
    e.preventDefault();
    beginDrag(e.clientX, e.clientY);
  };
  const handleTouchStart = (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    beginDrag(t.clientX, t.clientY);
  };

  const base =
    "relative w-16 h-16 rounded-full cursor-pointer shadow-lg border transition-all flex items-center justify-center";

  const stateClasses = {
    idle: "bg-gray-300 border-gray-400",
    thinking: "bg-blue-500 border-blue-600 ring-4 ring-blue-300/60 animate-pulse",
    tooling: "bg-yellow-500 border-yellow-600 ring-4 ring-yellow-300/60 animate-pulse",
    ready: "bg-green-500 border-green-600 ring-4 ring-green-300/60 animate-bounce",
    speaking: "bg-purple-500 border-purple-600 ring-4 ring-purple-300/60 animate-ping",
    muted: "bg-gray-500 border-gray-600 opacity-70 grayscale",
    error: "bg-red-500 border-red-600 ring-4 ring-red-300/60",
  };

  // Overlay icon to convey Start/Pause/Speaking/Tooling/Error
  let symbol = null;
  if (state === "speaking") symbol = "🔊";
  else if (state === "tooling") symbol = "🛠️";
  else if (state === "error") symbol = "⚠️";
  else symbol = isActive ? "⏸" : "▶";

  const containerCls = clsx("fixed z-50 group select-none", {
    "bottom-4 right-4 md:bottom-8 md:right-8": !pos, // default docked position (mobile-friendly)
  });

  const containerStyle =
    pos && typeof pos.x === "number" && typeof pos.y === "number"
      ? { left: `${pos.x}px`, top: `${pos.y}px` }
      : undefined;

  return (
    <div
      ref={orbRef}
      className={containerCls}
      style={containerStyle}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div
        className={clsx(
          base,
          stateClasses[state] || stateClasses.idle,
          dragging && "scale-95 opacity-90"
        )}
        onClick={onClick}
        title="Click: Start/Pause • Alt+Click: Mute/Unmute • Drag to move"
        role="button"
        aria-label="InnerVoices Orb"
      >
        {/* Subtle inner dot */}
        <div className="w-3 h-3 rounded-full bg-white/70" />

        {/* Center overlay symbol */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[18px] opacity-80">{symbol}</span>
        </div>
      </div>

      {/* Hover legend tooltip */}
      <div className="absolute bottom-20 right-0 w-64 p-3 rounded-md bg-white/95 dark:bg-neutral-900 shadow-lg border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-700 dark:text-neutral-300 hidden group-hover:block pointer-events-none">
        <div className="font-semibold mb-1">Orb legend</div>
        <ul className="space-y-1">
          <li className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-gray-300 border border-gray-400" />
            Idle
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-400 border border-blue-500" />
            Thinking (analysis running)
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500" />
            Tooling (calling tools)
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-green-400 border border-green-500" />
            Ready (comment prepared)
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-purple-400 border border-purple-500" />
            Speaking (voice output)
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 border border-red-600" />
            Error
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-gray-500 border border-gray-600" />
            Muted
          </li>
        </ul>
        <div className="mt-2">
          Click: Start/Pause • Alt+Click: Mute/Unmute • Drag to move
        </div>
      </div>
    </div>
  );
}
