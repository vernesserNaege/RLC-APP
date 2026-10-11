// Students: public, read-only. Only published modules come back.
import type { Level, ModuleCard, ModuleDetail } from "../types";
import { request } from "./client";

export const getModules = (level: Level) =>
  request<ModuleCard[]>(`/modules?level=${level}`);

export const getModule = (id: string) =>
  request<ModuleDetail>(`/modules/${encodeURIComponent(id)}`);
