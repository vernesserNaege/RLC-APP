import type { Level } from "../types";

// The one list of levels. Home, ModuleList and the level badges all read from here.
export const LEVELS: { key: Level; title: string; description: string }[] = [
  {
    key: "beginner",
    title: "Beginner",
    description:
      "Start with the fundamentals of robotics and basic electronics.",
  },
  {
    key: "intermediate",
    title: "Intermediate",
    description:
      "Develop your skills through more advanced robotics activities.",
  },
  {
    key: "projects",
    title: "Projects",
    description: "Apply your knowledge through hands-on robotics projects.",
  },
];

// True only for "beginner", "intermediate" or "projects".
// Also tells TypeScript that the value is a Level from here on.
export function isLevel(value: string | undefined): value is Level {
  return LEVELS.some((level) => level.key === value);
}

// "beginner" -> "Beginner"
export function levelTitle(level: Level): string {
  return LEVELS.find((item) => item.key === level)?.title ?? level;
}
