-- ============================================================
-- Ethio Matric Academy — PostgreSQL Schema
-- Migration 001: Initial Schema
-- Compatible with: Supabase PostgreSQL, Render PostgreSQL
-- ============================================================

-- ============================================================
-- ROLES
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id          SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name        VARCHAR(50)  NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

INSERT INTO roles (id, name, description)
  OVERRIDING SYSTEM VALUE
  VALUES
    (1, 'student',     'Grade 12 student preparing for Matric'),
    (2, 'admin',       'Content and user administrator'),
    (3, 'super_admin', 'Full system access')
  ON CONFLICT (id) DO NOTHING;

-- Sync the sequence after explicit ID inserts
SELECT setval(pg_get_serial_sequence('roles', 'id'), COALESCE((SELECT MAX(id) FROM roles), 0) + 1, false);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                     BIGINT       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  role_id                SMALLINT     NOT NULL DEFAULT 1,
  first_name             VARCHAR(100) NOT NULL,
  last_name              VARCHAR(100) NOT NULL,
  email                  VARCHAR(255) NOT NULL UNIQUE,
  phone                  VARCHAR(20),
  password_hash          VARCHAR(255) NOT NULL,
  avatar_url             VARCHAR(500),
  stream                 VARCHAR(50)  CHECK (stream IN ('natural_science','social_science')),
  school                 VARCHAR(255),
  region                 VARCHAR(100),
  city                   VARCHAR(100),
  is_email_verified      BOOLEAN      DEFAULT FALSE,
  email_verify_token     VARCHAR(255),
  email_verify_expires   TIMESTAMPTZ,
  is_active              BOOLEAN      DEFAULT TRUE,
  last_login             TIMESTAMPTZ,
  password_reset_token   VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  created_at             TIMESTAMPTZ  DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  DEFAULT NOW(),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role_id);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id            BIGINT       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id       BIGINT       NOT NULL,
  refresh_token VARCHAR(512) NOT NULL UNIQUE,
  device_id     VARCHAR(255),
  browser       VARCHAR(100),
  os            VARCHAR(100),
  ip_address    VARCHAR(45),
  location      VARCHAR(255),
  is_active     BOOLEAN      DEFAULT TRUE,
  expires_at    TIMESTAMPTZ  NOT NULL,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW(),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh ON sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_device  ON sessions(device_id);

-- ============================================================
-- STREAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS streams (
  id          SMALLINT     PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon        VARCHAR(100),
  is_active   BOOLEAN      DEFAULT TRUE,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

INSERT INTO streams (id, name, slug, description, icon)
  OVERRIDING SYSTEM VALUE
  VALUES
    (1, 'Natural Science', 'natural-science', 'Physics, Chemistry, Biology, Mathematics, English, ICT', 'science'),
    (2, 'Social Science',  'social-science',  'Economics, History, Geography, Mathematics, English, Citizenship', 'social')
  ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('streams', 'id'), COALESCE((SELECT MAX(id) FROM streams), 0) + 1, false);

-- ============================================================
-- SUBJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS subjects (
  id          INTEGER      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  stream_id   SMALLINT,
  name        VARCHAR(150) NOT NULL,
  slug        VARCHAR(150) NOT NULL UNIQUE,
  description TEXT,
  icon        VARCHAR(100),
  color       VARCHAR(20),
  sort_order  SMALLINT     DEFAULT 0,
  is_active   BOOLEAN      DEFAULT TRUE,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW(),
  CONSTRAINT fk_subjects_stream FOREIGN KEY (stream_id) REFERENCES streams(id)
);

INSERT INTO subjects (id, stream_id, name, slug, description, color, sort_order)
  OVERRIDING SYSTEM VALUE
  VALUES
    (1,  1, 'Mathematics', 'math-natural',    'Calculus, Algebra, Trigonometry',          '#0F4C81', 1),
    (2,  1, 'Physics',     'physics',         'Mechanics, Waves, Optics',                 '#14B8A6', 2),
    (3,  1, 'Chemistry',   'chemistry',       'Organic and Inorganic Chemistry',           '#F59E0B', 3),
    (4,  1, 'Biology',     'biology',         'Cell Biology, Genetics, Ecology',           '#22C55E', 4),
    (5,  1, 'English',     'english-natural', 'Grammar, Comprehension, Writing',           '#8B5CF6', 5),
    (6,  1, 'ICT',         'ict',             'Computer Science, Programming',             '#EC4899', 6),
    (7,  2, 'Mathematics', 'math-social',     'Business Math, Statistics',                 '#0F4C81', 1),
    (8,  2, 'Economics',   'economics',       'Micro and Macro Economics',                 '#14B8A6', 2),
    (9,  2, 'History',     'history',         'Ethiopian and World History',               '#F59E0B', 3),
    (10, 2, 'Geography',   'geography',       'Physical and Human Geography',              '#22C55E', 4),
    (11, 2, 'English',     'english-social',  'Grammar, Comprehension, Writing',           '#8B5CF6', 5),
    (12, 2, 'Citizenship', 'citizenship',     'Civics and Democratic Culture',             '#EC4899', 6)
  ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('subjects', 'id'), COALESCE((SELECT MAX(id) FROM subjects), 0) + 1, false);

-- ============================================================
-- CHAPTERS
-- ============================================================
CREATE TABLE IF NOT EXISTS chapters (
  id          INTEGER      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  subject_id  INTEGER      NOT NULL,
  title       VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order  SMALLINT     DEFAULT 0,
  is_active   BOOLEAN      DEFAULT TRUE,
  is_free     BOOLEAN      DEFAULT FALSE,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW(),
  CONSTRAINT fk_chapters_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT uq_chapter_subject_slug UNIQUE (subject_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_chapters_subject ON chapters(subject_id);

-- ============================================================
-- NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS notes (
  id          INTEGER      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  chapter_id  INTEGER      NOT NULL,
  title       VARCHAR(255) NOT NULL,
  content     TEXT         NOT NULL,
  type        VARCHAR(30)  DEFAULT 'study_note'
                CHECK (type IN ('study_note','key_points','formulas','examples','definitions')),
  sort_order  SMALLINT     DEFAULT 0,
  is_active   BOOLEAN      DEFAULT TRUE,
  is_free     BOOLEAN      DEFAULT FALSE,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW(),
  CONSTRAINT fk_notes_chapter FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

-- ============================================================
-- QUESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS questions (
  id              BIGINT       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  subject_id      INTEGER      NOT NULL,
  chapter_id      INTEGER,
  topic           VARCHAR(255),
  type            VARCHAR(30)  NOT NULL DEFAULT 'multiple_choice'
                    CHECK (type IN ('multiple_choice','true_false','fill_blank','image_based','matching')),
  question_text   TEXT         NOT NULL,
  image_url       VARCHAR(500),
  difficulty      VARCHAR(10)  DEFAULT 'medium'
                    CHECK (difficulty IN ('easy','medium','hard')),
  exam_importance VARCHAR(10)  DEFAULT 'medium'
                    CHECK (exam_importance IN ('low','medium','high','very_high')),
  year            SMALLINT,
  is_free         BOOLEAN      DEFAULT FALSE,
  is_active       BOOLEAN      DEFAULT TRUE,
  times_attempted INTEGER      DEFAULT 0,
  times_correct   INTEGER      DEFAULT 0,
  created_by      BIGINT,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW(),
  CONSTRAINT fk_questions_subject   FOREIGN KEY (subject_id)  REFERENCES subjects(id),
  CONSTRAINT fk_questions_chapter   FOREIGN KEY (chapter_id)  REFERENCES chapters(id),
  CONSTRAINT fk_questions_creator   FOREIGN KEY (created_by)  REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_questions_subject     ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_chapter     ON questions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty  ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_type        ON questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_active_free ON questions(is_active, subject_id, is_free);

-- ============================================================
-- OPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS options (
  id           BIGINT  PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  question_id  BIGINT  NOT NULL,
  option_label CHAR(1) NOT NULL,
  option_text  TEXT    NOT NULL,
  image_url    VARCHAR(500),
  is_correct   BOOLEAN DEFAULT FALSE,
  sort_order   SMALLINT DEFAULT 0,
  CONSTRAINT fk_options_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_options_question ON options(question_id);

-- ============================================================
-- EXPLANATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS explanations (
  id             BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  question_id    BIGINT NOT NULL UNIQUE,
  why_correct    TEXT   NOT NULL,
  why_a_wrong    TEXT,
  why_b_wrong    TEXT,
  why_c_wrong    TEXT,
  why_d_wrong    TEXT,
  memory_trick   TEXT,
  common_mistake TEXT,
  reference      VARCHAR(500),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_explanations_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- ============================================================
-- MOCK EXAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS mock_exams (
  id              INTEGER      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  subject_id      INTEGER,
  stream_id       SMALLINT,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  total_questions SMALLINT     NOT NULL DEFAULT 50,
  duration_mins   SMALLINT     NOT NULL DEFAULT 90,
  pass_mark       SMALLINT     DEFAULT 50,
  is_free         BOOLEAN      DEFAULT FALSE,
  is_active       BOOLEAN      DEFAULT TRUE,
  created_by      BIGINT,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW(),
  CONSTRAINT fk_mock_exams_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
  CONSTRAINT fk_mock_exams_stream  FOREIGN KEY (stream_id)  REFERENCES streams(id),
  CONSTRAINT fk_mock_exams_creator FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================================
-- EXAM QUESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS exam_questions (
  id          INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  exam_id     INTEGER NOT NULL,
  question_id BIGINT  NOT NULL,
  sort_order  SMALLINT DEFAULT 0,
  CONSTRAINT fk_eq_exam     FOREIGN KEY (exam_id)     REFERENCES mock_exams(id) ON DELETE CASCADE,
  CONSTRAINT fk_eq_question FOREIGN KEY (question_id) REFERENCES questions(id),
  CONSTRAINT uq_exam_question UNIQUE (exam_id, question_id)
);

-- ============================================================
-- RESULTS
-- ============================================================
CREATE TABLE IF NOT EXISTS results (
  id              BIGINT       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id         BIGINT       NOT NULL,
  exam_id         INTEGER,
  subject_id      INTEGER,
  chapter_id      INTEGER,
  mode            VARCHAR(20)  NOT NULL
                    CHECK (mode IN ('practice','mock_exam','daily_quiz','topic','chapter','random','weak_topic')),
  total_questions SMALLINT     NOT NULL,
  correct_answers SMALLINT     NOT NULL DEFAULT 0,
  wrong_answers   SMALLINT     NOT NULL DEFAULT 0,
  skipped         SMALLINT     NOT NULL DEFAULT 0,
  score_percent   NUMERIC(5,2),
  time_taken_secs INTEGER,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  CONSTRAINT fk_results_user    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_results_exam    FOREIGN KEY (exam_id)    REFERENCES mock_exams(id),
  CONSTRAINT fk_results_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
  CONSTRAINT fk_results_chapter FOREIGN KEY (chapter_id) REFERENCES chapters(id)
);

CREATE INDEX IF NOT EXISTS idx_results_user      ON results(user_id);
CREATE INDEX IF NOT EXISTS idx_results_exam      ON results(exam_id);
CREATE INDEX IF NOT EXISTS idx_results_subject   ON results(subject_id);
CREATE INDEX IF NOT EXISTS idx_results_user_date ON results(user_id, completed_at);

-- ============================================================
-- RESULT ANSWERS
-- ============================================================
CREATE TABLE IF NOT EXISTS result_answers (
  id              BIGINT   PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  result_id       BIGINT   NOT NULL,
  question_id     BIGINT   NOT NULL,
  selected_option CHAR(1),
  is_correct      BOOLEAN,
  time_spent_secs SMALLINT,
  CONSTRAINT fk_ra_result   FOREIGN KEY (result_id)   REFERENCES results(id) ON DELETE CASCADE,
  CONSTRAINT fk_ra_question FOREIGN KEY (question_id) REFERENCES questions(id)
);

CREATE INDEX IF NOT EXISTS idx_result_answers_result   ON result_answers(result_id);
CREATE INDEX IF NOT EXISTS idx_result_answers_question ON result_answers(question_id);

-- ============================================================
-- BOOKMARKS
-- ============================================================
CREATE TABLE IF NOT EXISTS bookmarks (
  id          BIGINT      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id     BIGINT      NOT NULL,
  question_id BIGINT      NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_bookmarks_user     FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookmarks_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  CONSTRAINT uq_bookmark UNIQUE (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);

-- ============================================================
-- SUBSCRIPTION PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id            SMALLINT     PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name          VARCHAR(100) NOT NULL,
  duration_days SMALLINT     NOT NULL,
  price_etb     NUMERIC(10,2) NOT NULL,
  description   TEXT,
  features      JSONB,
  is_active     BOOLEAN      DEFAULT TRUE,
  sort_order    SMALLINT     DEFAULT 0,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

INSERT INTO subscription_plans (id, name, duration_days, price_etb, description, sort_order)
  OVERRIDING SYSTEM VALUE
  VALUES
    (1, '1 Month',    30,  199.00, 'Full access for 1 month',  1),
    (2, '3 Months',   90,  499.00, 'Full access for 3 months', 2),
    (3, '6 Months',  180,  849.00, 'Full access for 6 months', 3),
    (4, '1 Year',    365, 1499.00, 'Full access for 1 year',   4)
  ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('subscription_plans', 'id'), COALESCE((SELECT MAX(id) FROM subscription_plans), 0) + 1, false);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id         BIGINT      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id    BIGINT      NOT NULL,
  plan_id    SMALLINT    NOT NULL,
  status     VARCHAR(15) DEFAULT 'pending'
               CHECK (status IN ('pending','active','expired','cancelled')),
  starts_at  TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_subs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_subs_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user    ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions(expires_at);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id                BIGINT       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id           BIGINT       NOT NULL,
  subscription_id   BIGINT,
  plan_id           SMALLINT     NOT NULL,
  amount_etb        NUMERIC(10,2) NOT NULL,
  currency          VARCHAR(10)  DEFAULT 'ETB',
  gateway           VARCHAR(20)  NOT NULL DEFAULT 'chapa'
                      CHECK (gateway IN ('chapa','telebirr','santimpay','manual')),
  gateway_tx_id     VARCHAR(255),
  gateway_ref       VARCHAR(255),
  status            VARCHAR(15)  DEFAULT 'pending'
                      CHECK (status IN ('pending','completed','failed','refunded')),
  admin_approved_by BIGINT,
  admin_approved_at TIMESTAMPTZ,
  meta              JSONB,
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  DEFAULT NOW(),
  CONSTRAINT fk_payments_user     FOREIGN KEY (user_id)           REFERENCES users(id),
  CONSTRAINT fk_payments_sub      FOREIGN KEY (subscription_id)   REFERENCES subscriptions(id),
  CONSTRAINT fk_payments_plan     FOREIGN KEY (plan_id)           REFERENCES subscription_plans(id),
  CONSTRAINT fk_payments_approver FOREIGN KEY (admin_approved_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_payments_user   ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id          INTEGER      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title       VARCHAR(255) NOT NULL,
  content     TEXT         NOT NULL,
  type        VARCHAR(10)  DEFAULT 'info'
                CHECK (type IN ('info','success','warning','error')),
  target_role VARCHAR(10)  DEFAULT 'all'
                CHECK (target_role IN ('all','student','admin')),
  is_active   BOOLEAN      DEFAULT TRUE,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  created_by  BIGINT,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  CONSTRAINT fk_announcements_creator FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================================
-- REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id          BIGINT      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id     BIGINT      NOT NULL,
  question_id BIGINT      NOT NULL,
  reason      VARCHAR(20) NOT NULL
                CHECK (reason IN ('wrong_answer','typo','unclear','image_issue','other')),
  description TEXT,
  status      VARCHAR(15) DEFAULT 'pending'
                CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  reviewed_by BIGINT,
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_reports_user     FOREIGN KEY (user_id)     REFERENCES users(id),
  CONSTRAINT fk_reports_question FOREIGN KEY (question_id) REFERENCES questions(id),
  CONSTRAINT fk_reports_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- ============================================================
-- DAILY QUIZ LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_quiz_log (
  id        BIGINT  PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id   BIGINT  NOT NULL,
  quiz_date DATE    NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  score     SMALLINT,
  result_id BIGINT,
  CONSTRAINT fk_dql_user   FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_dql_result FOREIGN KEY (result_id) REFERENCES results(id),
  CONSTRAINT uq_daily_quiz UNIQUE (user_id, quiz_date)
);

-- ============================================================
-- CONTACT MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_messages (
  id         INTEGER      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name       VARCHAR(200) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  subject    VARCHAR(100) DEFAULT 'general',
  message    TEXT         NOT NULL,
  status     VARCHAR(15)  DEFAULT 'new'
               CHECK (status IN ('new','read','replied')),
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id          SMALLINT     PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  value       TEXT,
  description VARCHAR(255),
  updated_by  BIGINT,
  updated_at  TIMESTAMPTZ  DEFAULT NOW(),
  CONSTRAINT fk_settings_updater FOREIGN KEY (updated_by) REFERENCES users(id)
);

INSERT INTO system_settings (setting_key, value, description)
  VALUES
    ('site_name',           'Ethio Matric Academy', 'Website name'),
    ('free_question_limit', '20',                   'Questions free users can access'),
    ('daily_quiz_count',    '10',                   'Questions per daily quiz'),
    ('maintenance_mode',    'false',                'Enable/disable maintenance mode')
  ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================
-- LEADERBOARD VIEW
-- ============================================================
CREATE OR REPLACE VIEW leaderboard_weekly AS
  SELECT
    u.id,
    CONCAT(u.first_name, ' ', u.last_name)         AS full_name,
    u.avatar_url,
    u.stream,
    COUNT(r.id)                                     AS exams_taken,
    AVG(r.score_percent)                            AS avg_score,
    SUM(r.correct_answers)                          AS total_correct,
    ROW_NUMBER() OVER (
      ORDER BY AVG(r.score_percent) DESC,
               SUM(r.correct_answers) DESC
    )                                               AS rank_pos
  FROM users u
  JOIN results r ON r.user_id = u.id
  WHERE r.completed_at >= NOW() - INTERVAL '7 days'
    AND u.role_id = 1
  GROUP BY u.id, u.first_name, u.last_name, u.avatar_url, u.stream;
