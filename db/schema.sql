-- ШТОЛЛИ — admin/CRM + gallery schema (MySQL 8, utf8mb4)
-- Idempotent: CREATE TABLE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS clients (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  phone       VARCHAR(64)  NULL,
  email       VARCHAR(200) NULL,
  telegram    VARCHAR(120) NULL,
  source      VARCHAR(40)  NULL,
  notes       TEXT         NULL,
  archived    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_clients_name (name),
  INDEX idx_clients_phone (phone),
  INDEX idx_clients_archived (archived)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS projects (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_id   INT UNSIGNED NOT NULL,
  title       VARCHAR(255) NOT NULL,
  type        VARCHAR(120) NULL,
  material    VARCHAR(80)  NULL,
  size        VARCHAR(120) NULL,
  stage       VARCHAR(32)  NOT NULL DEFAULT 'new',
  deadline    DATE         NULL,
  price       DECIMAL(12,2) NULL,
  prepaid     DECIMAL(12,2) NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'active',
  comment     TEXT         NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_proj_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  INDEX idx_proj_stage (stage),
  INDEX idx_proj_status (status),
  INDEX idx_proj_deadline (deadline),
  INDEX idx_proj_client (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leads (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source      VARCHAR(40)  NOT NULL DEFAULT 'contact',
  name        VARCHAR(200) NULL,
  contact     VARCHAR(255) NULL,
  type        VARCHAR(160) NULL,
  material    VARCHAR(80)  NULL,
  size        VARCHAR(120) NULL,
  timeline    VARCHAR(120) NULL,
  comment     TEXT         NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'new',
  client_id   INT UNSIGNED NULL,
  ip          VARCHAR(45)  NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_leads_status (status),
  INDEX idx_leads_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_notes (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id  INT UNSIGNED NOT NULL,
  text        TEXT         NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_note_proj FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_note_proj (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_history (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id  INT UNSIGNED NOT NULL,
  stage       VARCHAR(32)  NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_hist_proj FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_hist_proj (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_files (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id    INT UNSIGNED NOT NULL,
  filename      VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NULL,
  mime          VARCHAR(80)  NULL,
  size          INT UNSIGNED NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_file_proj FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_file_proj (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gallery_items (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  image        VARCHAR(255) NOT NULL,
  title        VARCHAR(255) NULL,
  description  TEXT         NULL,
  width        INT UNSIGNED NULL,
  height       INT UNSIGNED NULL,
  sort_order   INT          NOT NULL DEFAULT 0,
  visible      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_gallery_sort (sort_order),
  INDEX idx_gallery_visible (visible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  k  VARCHAR(64) PRIMARY KEY,
  v  TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lead_throttle (
  ip            VARCHAR(45) PRIMARY KEY,
  cnt           INT UNSIGNED NOT NULL DEFAULT 1,
  window_start  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
