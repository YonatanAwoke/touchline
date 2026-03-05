import React, { createContext, useContext, useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

type User = {
  id: number;
  email: string;
  username: string;
  role: string;
  organizationId?: number | null;
  coachProfile?: any | null;
};

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchMe(): Promise<User> {
  const res = await fetch("/api/auth/me", {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw res;
  const json = await res.json();
  return json.user;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useQuery<User | null>({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await fetchMe();
      } catch (err) {
        return null;
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw err;
    }

    // after successful login, refresh user
    await refetch();
    navigate("/dashboard");
  };

  const refresh = async () => {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) throw new Error("refresh failed");
    await refetch();
  };

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch(() => null);
    queryClient.removeQueries({ queryKey: ["me"] });
    navigate("/auth");
  };

  return (
    <AuthContext.Provider value={{ user: data ?? null, isLoading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default useAuth;
