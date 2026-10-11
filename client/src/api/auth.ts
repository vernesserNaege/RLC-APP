// Logging in and out (the main admin and teacher accounts).
import type { Me } from "../types";
import { request } from "./client";

export const login = (username: string, password: string) =>
  request<Me>("/auth/login", { method: "POST", body: { username, password } });

export const getMe = () => request<Me>("/auth/me");

export const logout = () =>
  request<{ ok: true }>("/auth/logout", { method: "POST" });
