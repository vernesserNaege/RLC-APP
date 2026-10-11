// Turning modules into .json files and back: for backups and for copying modules between crates.
import type { AdminModule, ModuleInput } from "../types";
import { downloadFile } from "./download";

const FORMAT = "rlc-module"; // marks a file as ours
const MAX_BYTES = 1_000_000; // the server accepts up to 1 MB per request

// A module without its database ids, step numbers or dates.
// This is what the editor saves and what a module file holds.
export const toModuleInput = (m: AdminModule): ModuleInput => ({
  title: m.title,
  level: m.level,
  status: m.status,
  shortDescription: m.shortDescription,
  description: m.description,
  objective: m.objective,
  durationMinutes: m.durationMinutes,
  coverImageUrl: m.coverImageUrl,
  components: m.components.map((c) => ({
    name: c.name,
    compartment: c.compartment,
    quantity: c.quantity,
  })),
  steps: m.steps.map((s) => ({
    title: s.title,
    type: s.type,
    instruction: s.instruction,
    codeTitle: s.codeTitle,
    code: s.code,
    imageUrl: s.imageUrl,
    modelUrl: s.modelUrl,
  })),
});

// "LED Control!" -> "led-control"
const fileName = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "module";

// Saves the module to the computer's Downloads folder as "<title>.json".
export function downloadModule(m: AdminModule) {
  const file = {
    format: FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    module: toModuleInput(m),
  };
  downloadFile(
    `${fileName(m.title)}.json`,
    JSON.stringify(file, null, 2),
    "application/json",
  );
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Reads a module file the admin picked. The server still checks every field when it is saved.
// Imported modules always start as drafts, so they can be checked before students see them.
export async function readModuleFile(file: File): Promise<ModuleInput> {
  if (file.size > MAX_BYTES)
    throw new Error(`"${file.name}" is too big (the limit is 1 MB).`);

  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error(`"${file.name}" is not a JSON file.`);
  }

  // Our export wraps the module as { format, version, module }; a plain module object also works.
  const module = isObject(data) && data.format === FORMAT ? data.module : data;
  if (!isObject(module) || typeof module.title !== "string") {
    throw new Error(`"${file.name}" is not an RLC module file.`);
  }
  return { ...(module as unknown as ModuleInput), status: "draft" };
}
