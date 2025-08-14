import { useState } from "react";
import { useNotesStore } from "../store/useNotesStore";
import { useConfigStore } from "../store/useConfigStore";

export default function NotesSidebar() {
  const {
    notes,
    currentId,
    createNote,
    deleteNote,
    selectNote,
    renameNote,
    updateContent,
    currentNote,
  } = useNotesStore();
  const updateConfig = useConfigStore((s) => s.updateConfig);


  const active = currentNote();

  return (
    <div className="h-full w-72 border-r border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm flex flex-col">
      <div className="p-3 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800">
        <div className="font-semibold text-sm">Notes</div>
        <div className="flex items-center gap-2">
          <button
            className="text-xs px-2 py-1 border rounded bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700"
            onClick={() => {
              const id = createNote("Untitled");
              selectNote(id);
            }}
            title="New note"
          >
            + New
          </button>
          <button
            className="text-xs px-2 py-1 border rounded bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700"
            onClick={() => updateConfig({ showNotes: false })}
            title="Hide notes"
          >
            ✕
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        {notes.length === 0 ? (
          <div className="p-3 text-xs text-neutral-500">No notes yet.</div>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {notes.map((n) => {
              const isActive = n.id === currentId;
              return (
                <li
                  key={n.id}
                  className={`group flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 ${isActive ? "bg-neutral-50 dark:bg-neutral-800/60" : ""}`}
                  onClick={() => selectNote(n.id)}
                >
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{n.title || "Untitled"}</div>
                      <div className="text-[11px] text-neutral-500">
                        {new Date(n.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] px-1.5 py-0.5 border rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                      onClick={(e) => {
                        e.stopPropagation();
                        const ok = confirm(`Delete note "${n.title || "Untitled"}"?`);
                        if (ok) deleteNote(n.id);
                      }}
                      title="Delete"
                    >
                      Delete
                    </button>
                  </>
                </li>
              );
            })}
          </ul>
        )}
      </div>

    </div>
  );
}
