# Ethio Matric Academy — Installation Guide

## Prerequisites

| Tool       | Version   | Install |
|------------|-----------|---------|
| Node.js    | 18+       | https://nodejs.org |
| MySQL      | 8.0+      | https://dev.mysql.com/downloads |
| npm        | 9+        | Comes with Node.js |

---

## Step 1 — Clone / Copy the Project

```
ethio-matric-academy/
├── backend/
├── frontend/
├── database/
│   └── schema.sql
└── INSTALLATION.md
```

---

## Step 2 — Database Setup

1. Open MySQL Workbench or run in terminal:

```bash
mysql -u root -p
```

2. Run the schema:

```sql
source d:/MUSA_WEB/Ethio_Matric_Academy/database/schema.sql
```

Or in MySQL Workbench: File → Run SQL Script → select `schema.sql`

---

## Step 3 — Backend Setup

```bash
cd backend
copy .env.example .env
```

Edit `.env` with your details:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ethio_matric_academy

JWT_ACCESS_SECRET=change_this_to_a_long_random_string
JWT_REFRESH_SECRET=change_this_to_another_long_random_string

PORT=5000
CLIENT_URL=http://localhost:5173
```

Install and start:

```bash
npm install
npm run dev
```

Backend runs at: **http://localhost:5000**
Health check: **http://localhost:5000/api/health**

---

## Step 4 — Frontend Setup

Open a new terminal:

```bash
cd frontend
copy .env.example .env
```

`.env` should contain:
```env
VITE_API_URL=http://localhost:5000/api
```

Install and start:

```bash
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## Step 5 — Create First Admin Account

1. Register a student account at http://localhost:5173/register
2. Open MySQL and run:

```sql
USE ethio_matric_academy;

-- Promote your account to super_admin (replace with your email)
UPDATE users SET role_id = 3 WHERE email = 'your@email.com';
```

3. Log out and log back in
4. You will be redirected to `/admin`

---

## Step 6 — Seed Sample Data (optional)

```sql
-- Add a sample subject (Physics)
INSERT INTO subjects (stream_id, name, slug, description, color, sort_order)
VALUES (1, 'Physics', 'physics', 'Mechanics, Waves, Optics', '#14B8A6', 2);

-- Add a sample chapter
INSERT INTO chapters (subject_id, title, slug, sort_order, is_free)
VALUES (1, 'Newton\'s Laws of Motion', 'newtons-laws', 1, 1);

-- Add a sample free question
INSERT INTO questions (subject_id, chapter_id, topic, type, question_text, difficulty, is_free, created_by)
VALUES (1, 1, 'Newton\'s Laws', 'multiple_choice', 
  'A 5 kg object is acted upon by a net force of 20 N. What is its acceleration?',
  'medium', 1, 1);

-- Get the question ID
SET @qid = LAST_INSERT_ID();

-- Add options
INSERT INTO options (question_id, option_label, option_text, is_correct, sort_order) VALUES
  (@qid, 'A', '2 m/s²',  0, 0),
  (@qid, 'B', '4 m/s²',  1, 1),
  (@qid, 'C', '10 m/s²', 0, 2),
  (@qid, 'D', '25 m/s²', 0, 3);

-- Add explanation
INSERT INTO explanations (question_id, why_correct, memory_trick, common_mistake)
VALUES (@qid,
  'Using Newton\'s Second Law: F = ma, so a = F/m = 20/5 = 4 m/s².',
  'Remember: F = ma, so a = F divided by m. Big mass = small acceleration for same force.',
  'Many students forget to divide Force by mass. They multiply instead.'
);
```

---

## Production Build

### Frontend
```bash
cd frontend
npm run build
# Output in frontend/dist/ — serve with nginx or any static host
```

### Backend
```bash
cd backend
npm start
# Use PM2 for production: pm2 start src/server.js --name ethio-api
```

---

## Common Issues

| Problem | Solution |
|---------|----------|
| `Cannot connect to MySQL` | Check DB_PASSWORD in .env, ensure MySQL is running |
| `Port 5000 already in use` | Change PORT in .env or kill the process |
| `CORS error` | Ensure CLIENT_URL in backend .env matches your frontend URL |
| `JWT errors after restart` | JWT_ACCESS_SECRET changed — all users need to log in again |
| `React not defined` | Ensure vite.config.js has `jsxRuntime: 'automatic'` |

---

## Environment Variables Reference

See `backend/.env.example` and `frontend/.env.example` for all variables.
