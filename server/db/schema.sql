-- UUID ids so Pi-made and cloud-made modules never collide when syncing (Phase 2)

CREATE TABLE IF NOT EXISTS modules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  level             TEXT NOT NULL CHECK (level IN ('beginner', 'intermediate', 'projects')),
  short_description TEXT NOT NULL DEFAULT '',
  description       TEXT NOT NULL DEFAULT '',
  objective         TEXT NOT NULL DEFAULT '',
  duration_minutes  INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
  cover_image_url   TEXT,
  -- draft = admin only, published = students see it, archived = hidden but kept
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
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
  code_title  TEXT,   
  code        TEXT,
  image_url   TEXT,
  model_url   TEXT,
  UNIQUE (module_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_modules_level_status ON modules(level, status);
CREATE INDEX IF NOT EXISTS idx_components_module ON module_components(module_id);
CREATE INDEX IF NOT EXISTS idx_steps_module ON module_steps(module_id);
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