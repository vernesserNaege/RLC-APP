// Teacher accounts (main admin only).
import type { Account } from "../types";
import { request } from "./client";

const accountPath = (id: string) => `/admin/accounts/${encodeURIComponent(id)}`;

export const getAccounts = () => request<Account[]>("/admin/accounts");

export const createAccount = (account: {
  displayName: string;
  username: string;
  password: string;
}) => request<Account>("/admin/accounts", { method: "POST", body: account });

export const setAccountPassword = (id: string, password: string) =>
  request<{ ok: true }>(`${accountPath(id)}/password`, {
    method: "PUT",
    body: { password },
  });

export const deleteAccount = (id: string) =>
  request<void>(accountPath(id), { method: "DELETE" });
