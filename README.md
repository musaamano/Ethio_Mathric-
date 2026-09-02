# Ethio Matric Academy
> **Master the Matric Exam, Shape Your Future.**

Ethiopia's #1 preparation platform for Grade 12 National Matric Examination students.

---

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS, Chart.js          |
| Backend    | Node.js, Express.js                             |
| Database   | MySQL 8                                         |
| Auth       | JWT + Refresh Tokens + bcrypt                   |
| Storage    | Local filesystem (Cloudinary-ready)             |
| Payment    | Chapa / Telebirr / SantimPay                    |

---

## Features

- ✅ **10,000+ Practice Questions** — All Grade 12 subjects, both streams
- ✅ **Detailed Explanations** — Why correct, why wrong, memory tricks, common mistakes
- ✅ **Real Mock Exams** — Countdown timer, auto-submit, instant results
- ✅ **Daily Quiz** — 10 questions every day to build consistency
- ✅ **Progress Analytics** — Charts, subject breakdown, weekly/monthly trends
- ✅ **Leaderboard** — Daily, weekly, monthly, all-time national rankings
- ✅ **Study Notes** — Chapter notes, formulas, key points, definitions
- ✅ **Bookmarks** — Save difficult questions for later
- ✅ **Secure Auth** — JWT, one session per account, device tracking
- ✅ **Admin Panel** — Full CMS for content, users, payments, reports

---

## Quick Start

```bash
# 1. Setup database
mysql -u root -p < database/schema.sql

# 2. Backend
cd backend && cp .env.example .env
# Edit .env with your DB credentials and JWT secrets
npm install && npm run dev

# 3. Frontend (new terminal)
cd frontend && cp .env.example .env
npm install && npm run dev
```

See [INSTALLATION.md](./INSTALLATION.md) for full setup guide.

---

## Project Structure

```
ethio-matric-academy/
├── backend/
│   ├── src/
│   │   ├── config/          # DB connection, JWT config
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/       # Auth, validation, upload, errors
│   │   ├── models/          # (future: ORM models)
│   │   ├── routes/          # Express routers
│   │   ├── services/        # Business logic
│   │   └── utils/           # Logger, API response helpers
│   ├── uploads/             # Local file storage
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/      # Button, Input, Modal, Toast, etc.
│   │   │   ├── dashboard/   # StatCard, ProgressChart, etc.
│   │   │   ├── home/        # Homepage sections
│   │   │   ├── layout/      # Navbar, Footer, DashboardLayout
│   │   │   └── questions/   # QuestionCard, OptionButton, etc.
│   │   ├── context/         # AuthContext
│   │   ├── hooks/           # useAuth, useTimer, useDebounce, etc.
│   │   ├── pages/
│   │   │   ├── admin/       # All admin panel pages
│   │   │   ├── public/      # Home, Login, Register, etc.
│   │   │   └── student/     # Dashboard, Practice, Exams, etc.
│   │   ├── services/        # Axios API service files
│   │   └── utils/           # helpers.js (formatters, validators)
│   └── .env.example
│
├── database/
│   └── schema.sql           # Complete MySQL schema
│
├── INSTALLATION.md
└── README.md
```

---

## API Endpoints

| Method | Endpoint                      | Description              |
|--------|-------------------------------|--------------------------|
| POST   | /api/auth/register            | Register new student     |
| POST   | /api/auth/login               | Login                    |
| POST   | /api/auth/logout              | Logout                   |
| POST   | /api/auth/refresh             | Refresh access token     |
| POST   | /api/auth/forgot-password     | Request reset link       |
| POST   | /api/auth/reset-password      | Reset password           |
| GET    | /api/subjects                 | List subjects            |
| GET    | /api/subjects/streams         | Streams with subjects    |
| GET    | /api/chapters?subject_id=     | Chapters for subject     |
| GET    | /api/questions/practice       | Get practice questions   |
| POST   | /api/questions/submit         | Submit answers           |
| GET    | /api/exams                    | List mock exams          |
| GET    | /api/exams/:id/start          | Start exam               |
| POST   | /api/exams/:id/submit         | Submit exam              |
| GET    | /api/analytics/overview       | Student dashboard data   |
| GET    | /api/analytics/leaderboard    | Leaderboard              |
| GET    | /api/payments/plans           | Subscription plans       |
| POST   | /api/payments/initiate        | Start payment            |
| GET    | /api/users/profile            | My profile               |
| PUT    | /api/users/profile            | Update profile           |

---

## User Roles

| Role         | Access                                           |
|--------------|--------------------------------------------------|
| `student`    | Practice, exams, analytics, subscription         |
| `admin`      | All student + manage content, users, payments    |
| `super_admin`| All admin + system settings, role management     |

---

## License

MIT © Ethio Matric Academy 2025
