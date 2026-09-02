-- ============================================================
-- Ethio Matric Academy - Complete Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS ethio_matric_academy
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ethio_matric_academy;

-- ============================================================
-- ROLES
-- ============================================================
CREATE TABLE roles (
  id          TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (name, description) VALUES
  ('student',     'Grade 12 student preparing for Matric'),
  ('admin',       'Content and user administrator'),
  ('super_admin', 'Full system access');

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id                   BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  role_id              TINYINT UNSIGNED NOT NULL DEFAULT 1,
  first_name           VARCHAR(100) NOT NULL,
  last_name            VARCHAR(100) NOT NULL,
  email                VARCHAR(255) NOT NULL UNIQUE,
  phone                VARCHAR(20),
  password_hash        VARCHAR(255) NOT NULL,
  avatar_url           VARCHAR(500),
  stream               ENUM('natural_science','social_science') DEFAULT NULL,
  school               VARCHAR(255),
  region               VARCHAR(100),
  city                 VARCHAR(100),
  is_email_verified    BOOLEAN DEFAULT FALSE,
  email_verify_token   VARCHAR(255),
  email_verify_expires DATETIME,
  is_active            BOOLEAN DEFAULT TRUE,
  last_login           DATETIME,
  password_reset_token VARCHAR(255),
  password_reset_expires DATETIME,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role_id);

-- ============================================================
-- SESSIONS (One active session per account)
-- ============================================================
CREATE TABLE sessions (
  id           BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  refresh_token VARCHAR(512) NOT NULL UNIQUE,
  device_id    VARCHAR(255),
  browser      VARCHAR(100),
  os           VARCHAR(100),
  ip_address   VARCHAR(45),
  location     VARCHAR(255),
  is_active    BOOLEAN DEFAULT TRUE,
  expires_at   DATETIME NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user      ON sessions(user_id);
CREATE INDEX idx_sessions_refresh   ON sessions(refresh_token);
CREATE INDEX idx_sessions_device    ON sessions(device_id);

-- ============================================================
-- STREAMS
-- ============================================================
CREATE TABLE streams (
  id          TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL UNIQUE,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon        VARCHAR(100),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO streams (name, slug, description, icon) VALUES
  ('Natural Science', 'natural-science', 'Physics, Chemistry, Biology, Mathematics, English, ICT', 'science'),
  ('Social Science',  'social-science',  'Economics, History, Geography, Mathematics, English, Citizenship', 'social');

-- ============================================================
-- SUBJECTS
-- ============================================================
CREATE TABLE subjects (
  id          INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  stream_id   TINYINT UNSIGNED,
  name        VARCHAR(150) NOT NULL,
  slug        VARCHAR(150) NOT NULL UNIQUE,
  description TEXT,
  icon        VARCHAR(100),
  color       VARCHAR(20),
  sort_order  TINYINT DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (stream_id) REFERENCES streams(id)
);

INSERT INTO subjects (stream_id, name, slug, description, color, sort_order) VALUES
  (1, 'Mathematics',    'math-natural',    'Calculus, Algebra, Trigonometry', '#0F4C81', 1),
  (1, 'Physics',        'physics',         'Mechanics, Waves, Optics',        '#14B8A6', 2),
  (1, 'Chemistry',      'chemistry',       'Organic and Inorganic Chemistry',  '#F59E0B', 3),
  (1, 'Biology',        'biology',         'Cell Biology, Genetics, Ecology',  '#22C55E', 4),
  (1, 'English',        'english-natural', 'Grammar, Comprehension, Writing',  '#8B5CF6', 5),
  (1, 'ICT',            'ict',             'Computer Science, Programming',    '#EC4899', 6),
  (2, 'Mathematics',    'math-social',     'Business Math, Statistics',        '#0F4C81', 1),
  (2, 'Economics',      'economics',       'Micro and Macro Economics',        '#14B8A6', 2),
  (2, 'History',        'history',         'Ethiopian and World History',      '#F59E0B', 3),
  (2, 'Geography',      'geography',       'Physical and Human Geography',     '#22C55E', 4),
  (2, 'English',        'english-social',  'Grammar, Comprehension, Writing',  '#8B5CF6', 5),
  (2, 'Citizenship',    'citizenship',     'Civics and Democratic Culture',    '#EC4899', 6);

-- ============================================================
-- CHAPTERS
-- ============================================================
CREATE TABLE chapters (
  id          INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  subject_id  INT UNSIGNED NOT NULL,
  title       VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order  SMALLINT DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  is_free     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE KEY uq_chapter_subject_slug (subject_id, slug)
);

CREATE INDEX idx_chapters_subject ON chapters(subject_id);

-- ============================================================
-- NOTES (Study notes per chapter)
-- ============================================================
CREATE TABLE notes (
  id          INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  chapter_id  INT UNSIGNED NOT NULL,
  title       VARCHAR(255) NOT NULL,
  content     LONGTEXT NOT NULL,
  type        ENUM('study_note','key_points','formulas','examples','definitions') DEFAULT 'study_note',
  sort_order  SMALLINT DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  is_free     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

-- ============================================================
-- QUESTIONS
-- ============================================================
CREATE TABLE questions (
  id                  BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  subject_id          INT UNSIGNED NOT NULL,
  chapter_id          INT UNSIGNED,
  topic               VARCHAR(255),
  type                ENUM('multiple_choice','true_false','fill_blank','image_based','matching') NOT NULL DEFAULT 'multiple_choice',
  question_text       TEXT NOT NULL,
  image_url           VARCHAR(500),
  difficulty          ENUM('easy','medium','hard') DEFAULT 'medium',
  exam_importance     ENUM('low','medium','high','very_high') DEFAULT 'medium',
  year                SMALLINT COMMENT 'Past exam year if applicable',
  is_free             BOOLEAN DEFAULT FALSE,
  is_active           BOOLEAN DEFAULT TRUE,
  times_attempted     INT UNSIGNED DEFAULT 0,
  times_correct       INT UNSIGNED DEFAULT 0,
  created_by          BIGINT UNSIGNED,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id)  REFERENCES subjects(id),
  FOREIGN KEY (chapter_id)  REFERENCES chapters(id),
  FOREIGN KEY (created_by)  REFERENCES users(id)
);

CREATE INDEX idx_questions_subject    ON questions(subject_id);
CREATE INDEX idx_questions_chapter    ON questions(chapter_id);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_type       ON questions(type);
CREATE INDEX idx_questions_active_free ON questions(is_active, subject_id, is_free);
CREATE FULLTEXT INDEX ft_questions ON questions(question_text, topic);

-- ============================================================
-- OPTIONS (Answers for questions)
-- ============================================================
CREATE TABLE options (
  id            BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  question_id   BIGINT UNSIGNED NOT NULL,
  option_label  CHAR(1) NOT NULL COMMENT 'A, B, C, D',
  option_text   TEXT NOT NULL,
  image_url     VARCHAR(500),
  is_correct    BOOLEAN DEFAULT FALSE,
  sort_order    TINYINT DEFAULT 0,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE INDEX idx_options_question ON options(question_id);

-- ============================================================
-- EXPLANATIONS
-- ============================================================
CREATE TABLE explanations (
  id                   BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  question_id          BIGINT UNSIGNED NOT NULL UNIQUE,
  why_correct          TEXT NOT NULL COMMENT 'Why the correct answer is right',
  why_a_wrong          TEXT COMMENT 'Why option A is wrong',
  why_b_wrong          TEXT COMMENT 'Why option B is wrong',
  why_c_wrong          TEXT COMMENT 'Why option C is wrong',
  why_d_wrong          TEXT COMMENT 'Why option D is wrong',
  memory_trick         TEXT COMMENT 'Helpful mnemonic or trick',
  common_mistake       TEXT COMMENT 'Common mistakes students make',
  reference            VARCHAR(500) COMMENT 'Textbook reference',
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- ============================================================
-- MOCK EXAMS
-- ============================================================
CREATE TABLE mock_exams (
  id              INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  subject_id      INT UNSIGNED,
  stream_id       TINYINT UNSIGNED,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  total_questions SMALLINT NOT NULL DEFAULT 50,
  duration_mins   SMALLINT NOT NULL DEFAULT 90,
  pass_mark       TINYINT DEFAULT 50,
  is_free         BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_by      BIGINT UNSIGNED,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (stream_id)  REFERENCES streams(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================================
-- EXAM QUESTIONS (Questions in a mock exam)
-- ============================================================
CREATE TABLE exam_questions (
  id           INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  exam_id      INT UNSIGNED NOT NULL,
  question_id  BIGINT UNSIGNED NOT NULL,
  sort_order   SMALLINT DEFAULT 0,
  FOREIGN KEY (exam_id)     REFERENCES mock_exams(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id),
  UNIQUE KEY uq_exam_question (exam_id, question_id)
);

-- ============================================================
-- RESULTS (Practice & Exam results)
-- ============================================================
CREATE TABLE results (
  id               BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id          BIGINT UNSIGNED NOT NULL,
  exam_id          INT UNSIGNED COMMENT 'NULL for practice',
  subject_id       INT UNSIGNED,
  chapter_id       INT UNSIGNED,
  mode             ENUM('practice','mock_exam','daily_quiz','topic','chapter','random','weak_topic') NOT NULL,
  total_questions  SMALLINT NOT NULL,
  correct_answers  SMALLINT NOT NULL DEFAULT 0,
  wrong_answers    SMALLINT NOT NULL DEFAULT 0,
  skipped          SMALLINT NOT NULL DEFAULT 0,
  score_percent    DECIMAL(5,2),
  time_taken_secs  INT UNSIGNED,
  started_at       DATETIME,
  completed_at     DATETIME,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_id)    REFERENCES mock_exams(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (chapter_id) REFERENCES chapters(id)
);

CREATE INDEX idx_results_user    ON results(user_id);
CREATE INDEX idx_results_exam    ON results(exam_id);
CREATE INDEX idx_results_subject ON results(subject_id);
CREATE INDEX idx_results_user_date ON results(user_id, completed_at);

-- ============================================================
-- RESULT ANSWERS (Per-question answers in a result)
-- ============================================================
CREATE TABLE result_answers (
  id             BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  result_id      BIGINT UNSIGNED NOT NULL,
  question_id    BIGINT UNSIGNED NOT NULL,
  selected_option CHAR(1) COMMENT 'A, B, C or D',
  is_correct     BOOLEAN,
  time_spent_secs SMALLINT,
  FOREIGN KEY (result_id)   REFERENCES results(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

CREATE INDEX idx_result_answers_result ON result_answers(result_id);
CREATE INDEX idx_result_answers_question ON result_answers(question_id);

-- ============================================================
-- BOOKMARKS
-- ============================================================
CREATE TABLE bookmarks (
  id           BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  question_id  BIGINT UNSIGNED NOT NULL,
  note         TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  UNIQUE KEY uq_bookmark (user_id, question_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE subscription_plans (
  id           TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name         VARCHAR(100) NOT NULL,
  duration_days SMALLINT NOT NULL,
  price_etb    DECIMAL(10,2) NOT NULL,
  description  TEXT,
  features     JSON,
  is_active    BOOLEAN DEFAULT TRUE,
  sort_order   TINYINT DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO subscription_plans (name, duration_days, price_etb, description, sort_order) VALUES
  ('1 Month',   30,  199.00, 'Full access for 1 month',  1),
  ('3 Months',  90,  499.00, 'Full access for 3 months', 2),
  ('6 Months', 180,  849.00, 'Full access for 6 months', 3),
  ('1 Year',   365, 1499.00, 'Full access for 1 year',   4);

CREATE TABLE subscriptions (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  plan_id     TINYINT UNSIGNED NOT NULL,
  status      ENUM('pending','active','expired','cancelled') DEFAULT 'pending',
  starts_at   DATETIME,
  expires_at  DATETIME,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

CREATE INDEX idx_subscriptions_user    ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status  ON subscriptions(status);
CREATE INDEX idx_subscriptions_expires ON subscriptions(expires_at);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payments (
  id                  BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id             BIGINT UNSIGNED NOT NULL,
  subscription_id     BIGINT UNSIGNED,
  plan_id             TINYINT UNSIGNED NOT NULL,
  amount_etb          DECIMAL(10,2) NOT NULL,
  currency            VARCHAR(10) DEFAULT 'ETB',
  gateway             ENUM('chapa','telebirr','santimpay','manual') NOT NULL DEFAULT 'chapa',
  gateway_tx_id       VARCHAR(255) COMMENT 'Transaction ID from gateway',
  gateway_ref         VARCHAR(255) COMMENT 'Reference from gateway',
  status              ENUM('pending','completed','failed','refunded') DEFAULT 'pending',
  admin_approved_by   BIGINT UNSIGNED,
  admin_approved_at   DATETIME,
  meta                JSON COMMENT 'Gateway response payload',
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)           REFERENCES users(id),
  FOREIGN KEY (subscription_id)   REFERENCES subscriptions(id),
  FOREIGN KEY (plan_id)           REFERENCES subscription_plans(id),
  FOREIGN KEY (admin_approved_by) REFERENCES users(id)
);

CREATE INDEX idx_payments_user   ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
CREATE TABLE announcements (
  id          INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title       VARCHAR(255) NOT NULL,
  content     TEXT NOT NULL,
  type        ENUM('info','success','warning','error') DEFAULT 'info',
  target_role ENUM('all','student','admin') DEFAULT 'all',
  is_active   BOOLEAN DEFAULT TRUE,
  published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at  DATETIME,
  created_by  BIGINT UNSIGNED,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================================
-- REPORTED QUESTIONS
-- ============================================================
CREATE TABLE reports (
  id           BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  question_id  BIGINT UNSIGNED NOT NULL,
  reason       ENUM('wrong_answer','typo','unclear','image_issue','other') NOT NULL,
  description  TEXT,
  status       ENUM('pending','reviewed','resolved','dismissed') DEFAULT 'pending',
  reviewed_by  BIGINT UNSIGNED,
  reviewed_at  DATETIME,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(id),
  FOREIGN KEY (question_id) REFERENCES questions(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- ============================================================
-- DAILY QUIZ TRACKER
-- ============================================================
CREATE TABLE daily_quiz_log (
  id         BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  quiz_date  DATE NOT NULL,
  completed  BOOLEAN DEFAULT FALSE,
  score      TINYINT,
  result_id  BIGINT UNSIGNED,
  FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (result_id) REFERENCES results(id),
  UNIQUE KEY uq_daily_quiz (user_id, quiz_date)
);

-- ============================================================
-- LEADERBOARD VIEW
-- ============================================================
CREATE OR REPLACE VIEW leaderboard_weekly AS
  SELECT
    u.id,
    CONCAT(u.first_name, ' ', u.last_name) AS full_name,
    u.avatar_url,
    u.stream,
    COUNT(r.id)               AS exams_taken,
    AVG(r.score_percent)      AS avg_score,
    SUM(r.correct_answers)    AS total_correct,
    ROW_NUMBER() OVER (ORDER BY AVG(r.score_percent) DESC, SUM(r.correct_answers) DESC) AS rank_pos
  FROM users u
  JOIN results r ON r.user_id = u.id
  WHERE r.completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    AND u.role_id = 1
  GROUP BY u.id;

-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================
CREATE TABLE system_settings (
  id          SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  value       TEXT,
  description VARCHAR(255),
  updated_by  BIGINT UNSIGNED,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

INSERT INTO system_settings (setting_key, value, description) VALUES
  ('site_name',           'Ethio Matric Academy', 'Website name'),
  ('free_question_limit', '20',                   'Questions free users can access'),
  ('daily_quiz_count',    '10',                   'Questions per daily quiz'),
  ('maintenance_mode',    'false',                'Enable/disable maintenance mode');
