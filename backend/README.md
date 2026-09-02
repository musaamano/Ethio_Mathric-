# Ethio Matric Academy — Backend API

Node.js + Express REST API backed by **Supabase PostgreSQL**.

---

## Table of Contents

1. [Stack](#stack)
2. [Prerequisites](#prerequisites)
3. [Environment Variables](#environment-variables)
4. [Install Dependencies](#install-dependencies)
5. [Run PostgreSQL Migrations](#run-postgresql-migrations)
6. [Seed the Database](#seed-the-database)
7. [Run Locally](#run-locally)
8. [Deploy on Render](#deploy-on-render)
9. [API Overview](#api-overview)
10. [Database Schema](#database-schema)
11. [Default Login Credentials](#default-login-credentials)

---

## Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Runtime     | Node.js 18+                       |
| Framework   | Express 4                         |
| Database    | PostgreSQL (Supabase)             |
| DB Driver   | `pg` (node-postgres) v8.11        |
| Auth        | JWT (access + refresh tokens)     |
| Passwords   | bcryptjs                          |
| Uploads     | multer                            |
| Email       | nodemailer                        |
| AI          | OpenAI (optional)                 |

---

## Prerequisites

- Node.js 18 or later
- A [Supabase](https://supabase.com) project (free tier works fine)
- Your `DATABASE_URL` from Supabase → Project Settings → Database → Connection string → URI

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

The only required variable to get started is:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.yeblwjyiztuuehiefixy.supabase.co:5432/postgres
```

Get the real password from:
**Supabase Dashboard → Project → Settings → Database → Database password**

Other important variables:

| Variable             | Description                              |
|----------------------|------------------------------------------|
| `PORT`               | HTTP port (default 5000)                 |
| `NODE_ENV`           | `development` or `production`            |
| `CLIENT_URL`         | Frontend origin for CORS                 |
| `JWT_ACCESS_SECRET`  | Secret for signing access tokens         |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens        |
| `BCRYPT_ROUNDS`      | Password hashing rounds (default 12)     |
| `MAIL_HOST`          | SMTP host for email                      |
| `MAIL_USER`          | SMTP username                            |
| `MAIL_PASS`          | SMTP password / app password             |
| `OPENAI_API_KEY`     | Optional — enables AI explanation gen    |
| `CHAPA_SECRET_KEY`   | Optional — Chapa payment gateway         |

> **Never** commit `.env` to version control. It is already in `.gitignore`.

---

## Install Dependencies

```bash
cd backend
npm install
```

---

## Run PostgreSQL Migrations

Migrations live in `db/migrations/`. Run them against your Supabase database:

```bash
npm run db:migrate
```

This will:
1. Connect to `DATABASE_URL`
2. Create a `_migrations` tracking table if it doesn't exist
3. Apply any unapplied `.sql` files in order (001_, 002_, ...)
4. Skip already-applied migrations on subsequent runs

The migration creates all tables:

`roles` · `users` · `sessions` · `streams` · `subjects` · `chapters` · `notes` ·
`questions` · `options` · `explanations` · `mock_exams` · `exam_questions` ·
`results` · `result_answers` · `bookmarks` · `subscription_plans` · `subscriptions` ·
`payments` · `announcements` · `reports` · `daily_quiz_log` · `system_settings` ·
`contact_messages` · `leaderboard_weekly` (view)

---

## Seed the Database

After migrations, seed demo/test data:

```bash
npm run db:seed
```

Or run migrations + seed in one command:

```bash
npm run db:setup
```

This creates default roles, subjects, chapters, sample questions with options and explanations, subscription plans, and three demo user accounts.

---

## Run Locally

```bash
npm run dev        # nodemon — auto-restarts on file changes
# or
npm start          # plain node
```

Server listens on `http://localhost:5000` (or `PORT` from `.env`).

Health check: `GET /api/health`

---

## Deploy on Render

### Build & Start Commands

| Setting       | Value              |
|---------------|--------------------|
| Build Command | `npm install`      |
| Start Command | `npm start`        |

### Environment Variables on Render

Add these in **Render → Service → Environment**:

```
DATABASE_URL     = postgresql://postgres:YOUR_PASSWORD@db.yeblwjyiztuuehiefixy.supabase.co:5432/postgres
NODE_ENV         = production
PORT             = 10000
CLIENT_URL       = https://your-frontend-domain.com
JWT_ACCESS_SECRET  = <generate a strong random secret>
JWT_REFRESH_SECRET = <generate a different strong random secret>
BCRYPT_ROUNDS    = 12
MAIL_HOST        = smtp.gmail.com
MAIL_PORT        = 587
MAIL_USER        = your@gmail.com
MAIL_PASS        = your_app_password
```

> Render automatically sets `PORT`. The app reads `process.env.PORT` so no hardcoding is needed.

### Run Migrations on Render

After deploying, open the Render **Shell** tab and run:

```bash
npm run db:migrate
npm run db:seed
```

Or add a one-time job in Render's **Jobs** section.

### Supabase SSL

The `pg` pool is configured with `ssl: { rejectUnauthorized: false }` when `NODE_ENV=production`, which is required for Supabase connections from Render.

---

## API Overview

All endpoints are prefixed with `/api`.

| Method | Path                              | Auth        | Description                  |
|--------|-----------------------------------|-------------|------------------------------|
| POST   | `/auth/register`                  | Public      | Register new student         |
| POST   | `/auth/login`                     | Public      | Login, returns JWT           |
| POST   | `/auth/logout`                    | JWT         | Invalidate session           |
| POST   | `/auth/refresh`                   | Cookie      | Rotate refresh token         |
| GET    | `/auth/verify/:token`             | Public      | Verify email                 |
| POST   | `/auth/forgot-password`           | Public      | Send reset link              |
| POST   | `/auth/reset-password`            | Public      | Reset password               |
| GET    | `/users/me`                       | JWT         | Get own profile              |
| PUT    | `/users/me`                       | JWT         | Update profile               |
| GET    | `/users`                          | Admin       | List all users               |
| GET    | `/subjects`                       | Public      | List subjects                |
| GET    | `/subjects/:slug`                 | Public      | Subject + chapters           |
| GET    | `/chapters`                       | Public      | Chapters for a subject       |
| GET    | `/questions`                      | JWT         | List/filter questions        |
| GET    | `/questions/practice`             | JWT         | Random practice questions    |
| POST   | `/questions/submit`               | JWT         | Submit practice answers      |
| GET    | `/exams`                          | JWT         | List mock exams              |
| POST   | `/exams/:id/start`                | JWT+Sub     | Start a mock exam            |
| POST   | `/exams/:id/submit`               | JWT+Sub     | Submit exam                  |
| GET    | `/analytics/overview`             | JWT         | Student dashboard data       |
| GET    | `/analytics/leaderboard`          | JWT         | Leaderboard                  |
| GET    | `/payments/plans`                 | Public      | Subscription plans           |
| POST   | `/payments/initiate`              | JWT         | Start payment                |
| GET    | `/announcements`                  | Public      | Active announcements         |
| POST   | `/contact`                        | Public      | Contact form                 |
| GET    | `/health`                         | Public      | Health check                 |

---

## Database Schema

Full schema is in `db/migrations/001_initial_schema.sql`.

Key relationships:

```
users ──── role_id ──▶ roles
users ──── subscriptions ──▶ subscription_plans
users ──── sessions
users ──── results ──▶ mock_exams / subjects / chapters
results ── result_answers ──▶ questions
questions ─ options (answers)
questions ─ explanations
questions ─ subject_id ──▶ subjects ──▶ streams
mock_exams ─ exam_questions ──▶ questions
```

---

## Default Login Credentials

Created by `npm run db:seed`:

| Role        | Email                            | Password       |
|-------------|----------------------------------|----------------|
| Super Admin | superadmin@ethiomatric.com       | `Admin@1234`   |
| Admin       | admin@ethiomatric.com            | `Admin@1234`   |
| Student     | student@ethiomatric.com          | `Student@1234` |

> Change these passwords immediately in any production deployment.

---

## Migration Notes

This backend was migrated from **MySQL (mysql2)** to **PostgreSQL (pg)** in August 2026.

Key changes made:
- `mysql2` removed, `pg@8.11.3` added
- `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` replaced with a single `DATABASE_URL`
- All `?` placeholders replaced with `$1, $2, ...`
- `[rows]` mysql2 destructuring replaced with `{ rows }`
- `result.insertId` replaced with `RETURNING id`
- `pool.getConnection()` / `beginTransaction()` replaced with `getClient()` / `BEGIN`
- `AUTO_INCREMENT` → `GENERATED ALWAYS AS IDENTITY`
- `ENUM(...)` → `VARCHAR` with `CHECK` constraint
- `DATE_FORMAT(col, '%Y-%m')` → `TO_CHAR(col, 'YYYY-MM')`
- `DATE_SUB(NOW(), INTERVAL x DAY)` → `NOW() - INTERVAL 'x days'`
- `ORDER BY RAND()` → `ORDER BY RANDOM()`
- `LIKE` → `ILIKE` for case-insensitive search
- `JSON` column type → `JSONB`
- `TIMESTAMP` → `TIMESTAMPTZ`
- `INSERT IGNORE` → `INSERT ... ON CONFLICT DO NOTHING`
