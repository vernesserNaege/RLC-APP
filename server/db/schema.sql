-- Robotics Learning Crate (RLC) database schema
-- Works on PostgreSQL 13+ (gen_random_uuid() is built in).
-- UUID primary keys are deliberate: in Phase 2 the Raspberry Pi and the cloud
-- each create modules on their own, and UUIDs never collide when they sync.

CREATE TABLE IF NOT EXISTS modules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  level             TEXT NOT NULL CHECK (level IN ('beginner', 'intermediate', 'projects')),
  short_description TEXT NOT NULL DEFAULT '',
  description       TEXT NOT NULL DEFAULT '',
  objective         TEXT NOT NULL DEFAULT '',
  duration_minutes  INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
  cover_image_url   TEXT,
  -- published = students see it, locked (archive it to edit it)
  -- archived  = hidden from students, editable; new modules start here. Unarchive = publish.
  status            TEXT NOT NULL DEFAULT 'archived' CHECK (status IN ('published', 'archived')),
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS module_components (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id   UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  compartment TEXT NOT NULL DEFAULT '',
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS module_steps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id   UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'instruction' CHECK (type IN ('instruction', 'arduino', 'test')),
  instruction TEXT NOT NULL DEFAULT '',
  code_title  TEXT,   -- what the Arduino code does, shown above the code
  code        TEXT,
  image_url   TEXT,   -- picture for this step (Cloudinary in Phase 1, local disk in Phase 2)
  model_url   TEXT,   -- 3D model (.glb) for this step
  UNIQUE (module_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_modules_level_status ON modules(level, status);
CREATE INDEX IF NOT EXISTS idx_components_module ON module_components(module_id);
CREATE INDEX IF NOT EXISTS idx_steps_module ON module_steps(module_id);

-- Adds code_title to databases created before it existed (safe to run every time).
ALTER TABLE module_steps ADD COLUMN IF NOT EXISTS code_title TEXT;

-- Teacher accounts, created by the admin (there is no public sign-up).
-- The main admin account is not in this table: it lives in .env (ADMIN_USERNAME / ADMIN_PASSWORD_HASH).
-- db:reset does not drop this table, so resetting the modules keeps the teachers' accounts.
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT NOT NULL,
  display_name  TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usernames are unique whatever their capitals: "Ana" and "ana" are the same person.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (lower(username));

-- Revisions after the Week 3 presentation (safe to run every time):
-- who added each module (their name is kept even if their account is deleted later)
ALTER TABLE modules ADD COLUMN IF NOT EXISTS created_by TEXT;
-- only two statuses now: old "draft" modules become archived (hidden and editable)
UPDATE modules SET status = 'archived' WHERE status = 'draft';
ALTER TABLE modules ALTER COLUMN status SET DEFAULT 'archived';
ALTER TABLE modules DROP CONSTRAINT IF EXISTS modules_status_check;
ALTER TABLE modules ADD CONSTRAINT modules_status_check CHECK (status IN ('published', 'archived'));
-- each staff account is a teacher (edits modules) or an admin (also manages accounts)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'teacher'
  CHECK (role IN ('teacher', 'admin'));
