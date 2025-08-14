import { create } from "zustand";
import { nanoid } from "nanoid";

function loadPersisted() {
  try {
    const raw = localStorage.getItem("iv_notes");
    if (!raw) return { notes: [], currentId: null };
    const parsed = JSON.parse(raw);
    return {
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      currentId: parsed.currentId || (parsed.notes?.[0]?.id ?? null),
    };
  } catch {
    return { notes: [], currentId: null };
  }
}

function persist(state) {
  try {
    localStorage.setItem(
      "iv_notes",
      JSON.stringify({ notes: state.notes, currentId: state.currentId })
    );
  } catch {}
}

export const useNotesStore = create((set, get) => ({
  ...loadPersisted(),

  createNote: (title = "Untitled") => {
    const id = nanoid(10);
    const now = Date.now();
    const note = { id, title, content: "", createdAt: now, updatedAt: now };
    set((state) => {
      const next = { notes: [note, ...state.notes], currentId: id };
      persist(next);
      return next;
    });
    return id;
  },

  deleteNote: (id) => {
    set((state) => {
      const notes = state.notes.filter((n) => n.id !== id);
      const currentId =
        state.currentId === id ? (notes[0]?.id ?? null) : state.currentId;
      const next = { notes, currentId };
      persist(next);
      return next;
    });
  },

  selectNote: (id) => {
    set((state) => {
      const next = { ...state, currentId: id };
      persist(next);
      return next;
    });
  },

  renameNote: (id, title) => {
    set((state) => {
      const notes = state.notes.map((n) =>
        n.id === id ? { ...n, title, updatedAt: Date.now() } : n
      );
      const next = { ...state, notes };
      persist(next);
      return next;
    });
  },

  updateContent: (id, content) => {
    set((state) => {
      // Auto-title: first non-empty line trimmed, fallback "Untitled"
      const firstLine =
        String(content || "")
          .split(/\r?\n/)
          .find((l) => l.trim().length > 0)?.trim() || "Untitled";
      const title = firstLine.length > 120 ? firstLine.slice(0, 120) + "…" : firstLine;

      const notes = state.notes.map((n) =>
        n.id === id ? { ...n, title, content, updatedAt: Date.now() } : n
      );
      const next = { ...state, notes };
      persist(next);
      return next;
    });
  },

  currentNote: () => {
    const { notes, currentId } = get();
    return notes.find((n) => n.id === currentId) || null;
  },
}));
