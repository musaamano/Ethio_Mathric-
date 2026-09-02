-- ============================================================
-- Schema Additions (run after schema.sql)
-- ============================================================

USE ethio_matric_academy;

-- Contact messages from the public contact form
CREATE TABLE IF NOT EXISTS contact_messages (
  id          INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(200) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  subject     VARCHAR(100) DEFAULT 'general',
  message     TEXT NOT NULL,
  status      ENUM('new','read','replied') DEFAULT 'new',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
