PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS posts (
 id TEXT PRIMARY KEY,
 category TEXT NOT NULL,
 title TEXT NOT NULL,
 content_html TEXT NOT NULL DEFAULT '',
 insurer TEXT NOT NULL DEFAULT '',
 issue_month TEXT,
 cover_key TEXT,
 pdf_key TEXT,
 status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','draft')),
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_posts_category_date ON posts (category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_month ON posts (issue_month, category);
CREATE TABLE IF NOT EXISTS attachments (
 id TEXT PRIMARY KEY,
 post_id TEXT REFERENCES posts(id) ON DELETE SET NULL,
 object_key TEXT UNIQUE NOT NULL,
 file_name TEXT NOT NULL,
 mime_type TEXT NOT NULL,
 size_bytes INTEGER NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attachments_post ON attachments (post_id);
