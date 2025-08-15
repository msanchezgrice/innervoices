import { useEffect, useRef, useState } from "react";
import { useConfigStore } from "../store/useConfigStore";

function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function ResponseHistory({ onClose = () => {}, noteId = null }) {
  const getResponseHistoryForNote = useConfigStore((s) => s.getResponseHistoryForNote);
  const clearResponseHistory = useConfigStore((s) => s.clearResponseHistory);
  const responseHistory = getResponseHistoryForNote(noteId) || [];
  const scrollRef = useRef(null);

  // Auto-scroll to top when new responses are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [responseHistory]);

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-neutral-900 shadow-lg border-l border-neutral-200 dark:border-neutral-800 overflow-hidden z-30 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <h2 className="text-lg font-bold">Response History</h2>
        <button
          className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          onClick={onClose}
          title="Close Response History"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Response List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {responseHistory.length === 0 ? (
          <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
            <div className="text-4xl mb-2">💭</div>
            <p>No responses yet</p>
            <p className="text-sm mt-1">Start writing to see AI responses here</p>
          </div>
        ) : (
          responseHistory.map((item, index) => (
            <div
              key={item.id || index}
              className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700"
            >
              {/* Timestamp */}
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                {formatTimeAgo(item.timestamp)}
              </div>

              {/* Response Content */}
              <div className="text-sm text-neutral-700 dark:text-neutral-200 whitespace-pre-wrap break-words leading-relaxed">
                {item.response || "No response"}
              </div>

              {/* Metadata */}
              {item.model && (
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 border-t border-neutral-200 dark:border-neutral-700 pt-2">
                  {item.model}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
        <button
          className="w-full text-xs px-3 py-2 border rounded bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
          onClick={() => {
            clearResponseHistory(noteId);
          }}
        >
          Clear History for This Note
        </button>
      </div>
    </div>
  );
}
