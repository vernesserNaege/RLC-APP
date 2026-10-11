// Staff (admin and teachers): modules of any status, dashboard numbers and uploads.
import type {
  AdminModule,
  AdminModuleRow,
  AdminStats,
  ModuleInput,
  ModuleStatus,
} from "../types";
import { request } from "./client";

const modulePath = (id: string) => `/admin/modules/${encodeURIComponent(id)}`;

export const getAdminModules = () =>
  request<AdminModuleRow[]>("/admin/modules");

export const getAdminModule = (id: string) =>
  request<AdminModule>(modulePath(id));

export const getAdminStats = () => request<AdminStats>("/admin/stats");

export const createModule = (module: ModuleInput) =>
  request<{ id: string }>("/admin/modules", { method: "POST", body: module });

export const updateModule = (id: string, module: ModuleInput) =>
  request<{ id: string }>(modulePath(id), { method: "PUT", body: module });

export const setModuleStatus = (id: string, status: ModuleStatus) =>
  request<{ id: string; status: ModuleStatus }>(`${modulePath(id)}/status`, {
    method: "PATCH",
    body: { status },
  });

export const deleteModule = (id: string) =>
  request<void>(modulePath(id), { method: "DELETE" });

// Uploads a picture or a .glb 3D model and returns its link.
export const uploadFile = (file: File, kind: "image" | "model") =>
  request<{ url: string }>(`/admin/uploads?kind=${kind}`, {
    method: "POST",
    body: file,
  });
