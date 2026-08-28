# stdhub-exams-api

> **Status: MVP** — this is a minimal viable product built for a school web course (HEI, WEB2). It covers the core QCM workflow end-to-end but is intentionally small, with several production concerns left out (see [MVP scope](#mvp-scope--known-limitations)).

Backend REST API for **HEI STDHub**, a multiple-choice-question (QCM) exam management platform. The API handles two distinct worlds:

- **Admin side** — manage students, courses, exams and their QCM questions, and consult exam results/statistics.
- **Student side** — browse available exams, take them a single time, and get an instantly auto-corrected score with a full correction.

The grading is **always computed server-side**; the client only sends the IDs of the choices selected.

The OpenAPI specification lives in [`docs/spec.yaml`](docs/spec.yaml) (the API is documented in French).

---

## Core features (MVP)

- JWT-based authentication (`Bearer` token, 24 h expiry) with `ADMIN` / `STUDENT` roles.
- Login rate limiting (5 attempts per 15 minutes).
- Admin CRUD for **students**, **courses**, **exams** and **questions**.
- Questions accept 2 to 6 choices, with exactly one correct answer and a per-question score.
- Exam availability window (`startDate` → `endDate`); students can only access exams inside this window.
- Single attempt per student per exam (enforced with a database `UNIQUE` constraint + transaction).
- Server-side grading with a full per-question correction returned right after submission.
- Exam results endpoint with class average.
- Password hashing with `bcryptjs` (`10` salt rounds).
- Security headers (`helmet`), strict CORS whitelist, centralized error handling.

---

## Tech stack

| Layer       | Technology                                 |
| ----------- | ------------------------------------------ |
| Language    | TypeScript (7.x), ESM (`"type": "module"`) |
| Runtime     | Node.js                                    |
| Web server  | Express 5                                  |
| Database    | PostgreSQL                                 |
| DB driver   | `pg` (connection pool)                     |
| Auth        | `jsonwebtoken` + `bcryptjs`                |
| Security    | `helmet`, `cors`, `express-rate-limit`     |
| Config      | `dotenv`                                   |
| Dev tooling | `nodemon`, `ts-node`, `typescript`         |

### Required versions

| Tool       | Version                            | Notes                                                                                                                                         |
| ---------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js    | **≥ 22.18** (verified on v22.22.2) | The dev script runs `.ts` files directly (`node src/index.ts`), which requires native type stripping (enabled by default since 22.18 / 23.6). |
| npm        | ≥ 10                               | Any recent npm works.                                                                                                                         |
| PostgreSQL | ≥ 13 (any recent version)          | Uses `TIMESTAMPTZ`, `SERIAL`, sequences and JSON aggregates built into Postgres.                                                              |

> Older Node versions (≤ 22.17) will fail to run `npm run dev` unless type stripping is enabled via the `--experimental-strip-types` flag.

---

## Project structure

```
├── docs/
│   └── spec.yaml                 # OpenAPI 3.0.3 specification
├── src/
│   ├── index.ts                  # Entry point: connects to DB then starts the server
│   ├── app.ts                    # Express app, middlewares, router mounting, error handlers
│   ├── config/
│   │   └── db.ts                 # pg Pool + connection test
│   ├── migrations/               # SQL migrations (run manually, in order)
│   │   ├── 001_database_init.sql
│   │   ├── 002_create_tables.sql
│   │   ├── 003_create_courses.sql
│   │   ├── 004_seed_admin.sql
│   │   └── 005_seed_students.sql
│   ├── routes/                   # Express routers (URL → controller)
│   ├── controllers/              # HTTP layer: parse request, call service, build response
│   ├── services/                 # Business logic & validation (DomainError)
│   ├── repositories/             # SQL queries (the only layer that talks to Postgres)
│   ├── models/                   # TypeScript interfaces for the data shapes
│   ├── middlewares/
│   │   └── auth.ts               # requireAuth + requireRole
│   ├── security/
│   │   ├── jwtSecurity.ts        # JWT sign/verify
│   │   ├── passwordSecurity.ts   # bcrypt hash/compare
│   │   └── authentificatedRequest.ts
│   └── errors/
│       └── errors.ts             # HttpError + DomainError
├── .env.example                  # Template for environment variables
├── package.json
└── tsconfig.json
```

---

## How it works

The code follows a classic **layered architecture**:

```
HTTP request
   │
   ▼
Routes (src/routes) ──► Controllers (src/controllers)
                              │
                              ▼
                        Services (src/services)  ← business rules, input validation, DomainError
                              │
                              ▼
                        Repositories (src/repositories)  ← raw SQL via the pg pool
                              │
                              ▼
                        PostgreSQL (stdhub_exams_db)
```

Rules of thumb enforced in this codebase:

1. **Repositories** own every SQL query. They are the only part that imports `pool` from `config/db.ts`.
2. **Services** hold the business logic and validate request payloads. They throw `DomainError`s ("Ressource introuvable", "Le code de cours existe déjà", "Données invalides : ...") and never touch HTTP concerns.
3. **Controllers** translate `DomainError` into HTTP responses through `handleControllerError` (404 / 409 / 400 depending on the message) and wrap everything in `try/catch`.
4. **Middlewares** guard routes: `requireAuth` decodes the JWT & attaches `req.user`, `requireRole("ADMIN" | "STUDENT")` restricts access.
5. **Multi-write operations** (creating/updating a question with its choices, submitting an exam) run inside SQL **transactions** managed by the repositories.

### Authentication flow

- `POST /api/auth/login` → the repository looks up the account in `admins` (role `ADMIN`), then in `students` (role `STUDENT`). It verifies the bcrypt hash and the account's active flag, then returns a JWT (payload: `{ id, role }`, expires in 24 h).
- Every protected route expects `Authorization: Bearer <token>`.
- Login is rate-limited to 5 attempts / 15 min per IP.

### Exam lifecycle

1. **Admin** creates a `Course`, then an `Exam` linked to it (with a start/end availability window).
2. **Admin** adds `Question`s (2–6 `Choice`s each, exactly one correct). Creativity on an exam is **locked** as soon as the exam has at least one attempt.
3. **Student** lists `/api/my/exams` (only exams currently open and not yet taken, per student).
4. **Student** opens an exam detail (correct answers are hidden) and submits `{ answers: [{ questionId, choiceId }, ...] }`.
5. The service grades the attempt inside a transaction, stores it and returns the score + a full correction (`isCorrect` per question).
6. A student can _never_ take an exam twice — enforced both in the service and by the `UNIQUE (student_id, exam_id)` DB constraint.

---

## Local installation (for developers)

### 1. Prerequisites

- Node.js ≥ 22.18
- npm ≥ 10
- PostgreSQL running locally (any recent version)

### 2. Clone & install dependencies

```bash
git clone https://github.com/fatratra-png/stdhub-exams-api.git
cd stdhub-exams-api
npm install
```

### 3. Create the database

```bash
psql -U postgres -f src/migrations/001_database_init.sql
```

### 4. Apply the schema migrations

Run them **in order**, on the `stdhub_exams_db` database:

```bash
psql -U postgres -d stdhub_exams_db -f src/migrations/002_create_tables.sql
psql -U postgres -d stdhub_exams_db -f src/migrations/003_create_courses.sql
psql -U postgres -d stdhub_exams_db -f src/migrations/004_seed_admin.sql
psql -U postgres -d stdhub_exams_db -f src/migrations/005_seed_students.sql
```

### 5. Configure the environment

```bash
cp .env.example .env
```

Then edit `.env` to match your local setup:

```env
# PostgreSQL connection — stdhub_exams_db
PGHOST=localhost
PGPORT=5432
PGDATABASE=stdhub_exams_db
PGUSER=postgres
PGPASSWORD=your_password

# Server
PORT=3000

# Auth — use a long random string
JWT_SECRET=change_me_to_a_long_random_secret

# Client url (frontend) — origin allowed by CORS
CLIENT_URL=http://localhost:5173
```

`CLIENT_URL` is **required**: the app refuses to start if it is missing. `JWT_SECRET` is validated at import time.

### 6. Run the server

```bash
npm run dev
```

You should see:

```
PostgreSQL connection established
Server running on http://localhost:3000
```

Health check: `GET http://localhost:3000/` → `stdhub-exams-api is running`

### 7. Seeded accounts

The migrations seed demo data so you can log in right away:

| Role    | Email                       | Password      |
| ------- | --------------------------- | ------------- |
| Admin   | `admin@mail.hei.school`     | `admin123`    |
| Student | e.g. `mamy@mail.hei.school` | `Password123` |

> All seeded students (`005_seed_students.sql`) share the same password `Password123`. Passwords are hashed with bcrypt — there is no plaintext in the database.

---

## Environment variables

| Variable     | Required | Default | Description                                                          |
| ------------ | -------- | ------- | -------------------------------------------------------------------- |
| `PGHOST`     | yes      | —       | PostgreSQL host                                                      |
| `PGPORT`     | yes      | —       | PostgreSQL port (usually `5432`)                                     |
| `PGDATABASE` | yes      | —       | Database name (`stdhub_exams_db`)                                    |
| `PGUSER`     | yes      | —       | PostgreSQL user                                                      |
| `PGPASSWORD` | yes      | —       | PostgreSQL password                                                  |
| `PORT`       | no       | `3000`  | Port the API listens on                                              |
| `JWT_SECRET` | yes      | —       | Secret used to sign/verify JWTs (server refuses to start without it) |
| `CLIENT_URL` | yes      | —       | Frontend origin allowed by CORS (server refuses to start without it) |

---

## Database schema

Tables created by `002_create_tables.sql`:

- **admins** — `id` (`ADMIN001`…), email, `password_hash`, `created_at`
- **students** — `id` (`STD26001`…), `first_name`, `name`, email, `password_hash`, `is_active`, `created_at`
- **courses** — `id`, unique `code`, `name`, `description`
- **exams** — `id`, `course_id` (FK, delete restricted), `title`, `description`, `start_date`, `end_date`
- **questions** — `id`, `exam_id` (FK, cascade), `statement`, `points > 0`, `position`
- **choices** — `id`, `question_id` (FK, cascade), `label`, `is_correct`
- **attempts** — `id`, `student_id` (FK), `exam_id` (FK), `started_at`, `submitted_at`, `score`, **`UNIQUE (student_id, exam_id)`**
- **answers** — `id`, `attempt_id`, `question_id`, `choice_id`, `UNIQUE (attempt_id, question_id)`

Relationships:

```
courses 1──N exams 1──N questions 1──N choices
admins / students 1──N attempts 1──N answers
```

---

## Available scripts

| Command         | Description                                              |
| --------------- | -------------------------------------------------------- |
| `npm run dev`   | Start in watch mode (`nodemon --exec node src/index.ts`) |
| `npm run build` | Compile with `tsc`                                       |
| `npm start`     | Start the compiled output                                |

> There are no automated tests in this repository yet.

---

## MVP scope & known limitations

Because this is an MVP, the following are intentionally missing or simplified:

- **No automated tests** and no CI pipeline.
- **No validation library** — request payloads are validated manually in the services.
- **Single-role auth only** — JWT without refresh tokens, no email verification, no password reset flow.
- **Rate limiting only on login** (5 / 15 min); other endpoints are unprotected against brute force.
- **No pagination, sorting or search** on list endpoints.
- **No exam timer** — `started_at` is set to `NOW()` at submission time; there is no per-exam duration tracking.
- **Only one correct answer per question** (simple QCM), no question shuffling or random ordering.
- **Migrations are plain SQL** applied manually via `psql`; there is no migration runner.
- **UI-facing strings and the OpenAPI doc are in French** — the API was built in a French course context.

These are all natural follow-ups if the project grows beyond the MVP.

---

## API endpoints

All protected endpoints require `Authorization: Bearer <token>`. Error responses follow `{ "message": "..." }` (messages are in French).

### Authentification

| Method | Path              | Access | Description                                                         |
| ------ | ----------------- | ------ | ------------------------------------------------------------------- |
| POST   | `/api/auth/login` | Public | Log in, returns a `token` + user profile (rate-limited: 5 / 15 min) |

### Admin — students

| Method | Path                | Description                                                              |
| ------ | ------------------- | ------------------------------------------------------------------------ |
| GET    | `/api/students`     | List all students                                                        |
| POST   | `/api/students`     | Create a student (email must be `*@mail.hei.school`, password ≥ 8 chars) |
| PUT    | `/api/students/:id` | Update a student; passing `password` resets it                           |
| DELETE | `/api/students/:id` | Deactivate a student (`is_active = false`)                               |

### Admin — courses

| Method | Path               | Description                                     |
| ------ | ------------------ | ----------------------------------------------- |
| GET    | `/api/courses`     | List all courses                                |
| POST   | `/api/courses`     | Create a course (unique `code`)                 |
| PUT    | `/api/courses/:id` | Update a course                                 |
| DELETE | `/api/courses/:id` | Delete a course — refused if it has exams (409) |

### Admin — exams & questions

| Method | Path                       | Description                                                                  |
| ------ | -------------------------- | ---------------------------------------------------------------------------- |
| GET    | `/api/exams?courseId=`     | List exams, optionally filtered by course (includes question/attempt counts) |
| POST   | `/api/exams`               | Create an exam (`startDate` must be < `endDate`)                             |
| GET    | `/api/exams/:id`           | Exam detail **with correct answers visible**                                 |
| PUT    | `/api/exams/:id`           | Update an exam                                                               |
| DELETE | `/api/exams/:id`           | Delete an exam — refused if it has attempts (409)                            |
| GET    | `/api/exams/:id/questions` | List questions (choices + `isCorrect`)                                       |
| POST   | `/api/exams/:id/questions` | Add a question (2–6 choices, exactly one correct)                            |
| PUT    | `/api/questions/:id`       | Update a question — refused if the exam has attempts (409)                   |
| DELETE | `/api/questions/:id`       | Delete a question — refused if the exam has attempts (409)                   |
| GET    | `/api/exams/:id/results`   | Per-student results, attempts count and class average                        |

### Student space

| Method | Path                       | Description                                                                     |
| ------ | -------------------------- | ------------------------------------------------------------------------------- |
| GET    | `/api/my/exams`            | Exams currently available to the logged-in student (open window, not yet taken) |
| GET    | `/api/my/exams/:id`        | Exam detail with questions and choices (correct answers hidden)                 |
| POST   | `/api/my/exams/:id/submit` | Submit `{ answers: [{ questionId, choiceId }] }` → score + full correction      |
| GET    | `/api/my/results`          | History of the student's results (score / max score per exam)                   |

Full request/response schemas, status codes and examples are documented in [`docs/spec.yaml`](docs/spec.yaml).

---
