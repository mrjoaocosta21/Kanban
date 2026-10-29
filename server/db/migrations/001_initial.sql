CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  job_title TEXT NOT NULL DEFAULT '',
  initials TEXT NOT NULL,
  avatar_url TEXT,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX users_email_unique ON users (LOWER(email));

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('manager', 'collaborator')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (CHAR_LENGTH(title) BETWEEN 1 AND 160),
  status TEXT NOT NULL CHECK (status IN ('todo', 'inprogress', 'done')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  assignee_id TEXT NOT NULL,
  date_label TEXT NOT NULL DEFAULT 'Sem data',
  tags JSONB NOT NULL DEFAULT '[]'::JSONB CHECK (JSONB_TYPEOF(tags) = 'array'),
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (workspace_id, assignee_id)
    REFERENCES workspace_members(workspace_id, user_id),
  FOREIGN KEY (workspace_id, created_by_id)
    REFERENCES workspace_members(workspace_id, user_id),
  FOREIGN KEY (workspace_id, updated_by_id)
    REFERENCES workspace_members(workspace_id, user_id)
);

CREATE INDEX tasks_workspace_status_position_idx
  ON tasks (workspace_id, status, position)
  WHERE deleted_at IS NULL;
CREATE INDEX tasks_workspace_assignee_idx
  ON tasks (workspace_id, assignee_id)
  WHERE deleted_at IS NULL;

CREATE TABLE task_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created', 'updated', 'status_changed', 'reordered', 'deleted'
  )),
  actor_id TEXT NOT NULL REFERENCES users(id),
  payload JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (JSONB_TYPEOF(payload) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX task_events_task_created_idx ON task_events (task_id, created_at);

CREATE OR REPLACE FUNCTION prevent_task_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'task_events is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_events_append_only
BEFORE UPDATE OR DELETE ON task_events
FOR EACH ROW EXECUTE FUNCTION prevent_task_event_mutation();

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sessions_user_idx ON sessions (user_id);
CREATE INDEX sessions_expiry_idx ON sessions (expires_at);
