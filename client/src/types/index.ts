// Shapes of the data the API sends back.
// Must match the SQL in server/src/routes/modules.js and server/src/routes/admin.js.

export type Level = "beginner" | "intermediate" | "projects";
export type StepType = "instruction" | "arduino" | "test";
export type ModuleStatus = "draft" | "published" | "archived";

// One card on the module list.
export interface ModuleCard {
  id: string;
  title: string;
  level: Level;
  shortDescription: string;
  coverImageUrl: string | null; // picture on the module card
}

export interface ModuleComponent {
  id: string;
  name: string;
  compartment: string;
  quantity: number;
}

export interface ModuleStep {
  id: string;
  number: number;
  title: string;
  type: StepType;
  instruction: string;
  codeTitle: string | null; // what the Arduino code does, e.g. "LED Blink: ..."
  code: string | null;
  imageUrl: string | null;
  modelUrl: string | null;
}

// A full module: the card fields plus everything the details and lesson pages show.
export interface ModuleDetail extends ModuleCard {
  description: string;
  objective: string;
  durationMinutes: number;
  components: ModuleComponent[];
  steps: ModuleStep[];
}

// A module as the admin editor loads it: any status, plus when it was last saved.
export interface AdminModule extends ModuleDetail {
  status: ModuleStatus;
  updatedAt: string;
}

// What the editor sends when saving. No ids or step numbers: the server makes those.
export type ComponentInput = Omit<ModuleComponent, "id">;
export type StepInput = Omit<ModuleStep, "id" | "number">;

export interface ModuleInput {
  title: string;
  level: Level;
  status: ModuleStatus;
  shortDescription: string;
  description: string;
  objective: string;
  durationMinutes: number;
  coverImageUrl: string | null;
  components: ComponentInput[];
  steps: StepInput[];
}

// Who is logged in: the main admin, or a teacher account the admin made.
export interface Me {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "teacher";
}

// One teacher account on the Accounts page.
export interface Account {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
}

// Dashboard numbers that only the database can count (archived modules left out).
export interface AdminStats {
  arduinoPrograms: number; // steps that have Arduino code
  topComponents: { name: string; modules: number; quantity: number }[]; // the 8 most used parts
}

// One row of the admin module table (every status, not just published).
export interface AdminModuleRow {
  id: string;
  title: string;
  level: Level;
  status: ModuleStatus;
  stepCount: number;
  updatedAt: string;
}