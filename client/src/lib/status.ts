import type { ModuleStatus } from "../types";

// What each status is called on screen. The database keeps the short names.
export const STATUS_LABEL: Record<ModuleStatus, string> = {
  published: "Published",
  archived: "Archived",
};

// Only archived modules can be edited; published ones are locked (archive to edit).
export const isEditable = (status: ModuleStatus) => status === "archived";
