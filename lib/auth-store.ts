"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { UserRole } from "./types"

interface AuthState {
  userId: string | null
  username: string | null
  role: UserRole | null
  name: string | null
  isAuthenticated: boolean
  login: (userId: string, username: string, role: UserRole, name: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      username: null,
      role: null,
      name: null,
      isAuthenticated: false,
      login: (userId, username, role, name) => set({ userId, username, role, name, isAuthenticated: true }),
      logout: () => set({ userId: null, username: null, role: null, name: null, isAuthenticated: false }),
    }),
    {
      name: "waik-auth-storage",
    },
  ),
)
