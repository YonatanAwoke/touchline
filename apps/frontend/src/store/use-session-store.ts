import { create } from "zustand";

interface SessionState {
    selectedSessionId: string | null;
    setSelectedSessionId: (id: string | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
    selectedSessionId: null,
    setSelectedSessionId: (id) => set({ selectedSessionId: id }),
}));
