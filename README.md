# School Admission System

A first-come-first-served admission system for a school. A student applies for a class and gets a **seat hold** that lasts a limited time (10 minutes by default). Paying the admission fee inside that window confirms the seat; otherwise the hold expires and the seat goes back to the pool. Each shift (for example *Class 6 – Morning Shift* and *Class 6 – Day Shift*) is a separate class with its own seat count. The backend guarantees that a class is never overbooked, even under heavy concurrent load and across several backend instances.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | .NET 10 (`net10.0`), ASP.NET Core Web API, Clean Architecture |
| Database | PostgreSQL 16 (`postgres:16-alpine`) |
| ORM | Entity Framework Core 10.0.14 + Npgsql provider 10.0.3 |
| Frontend | React 19, TypeScript 7, Vite 8, React Router 7, TanStack Query 5 |
| UI | Tailwind CSS 4, shadcn/ui (Radix), lucide-react, sonner; Bengali UI |
| Backend tests | xUnit 2.9, `Microsoft.AspNetCore.Mvc.Testing`, real PostgreSQL |
| Frontend tests | Vitest 5, Testing Library, MSW 3, jsdom |
| Containers | Docker Compose; .NET SDK/ASP.NET images, Node 22 + nginx for the frontend |

## Quick start

**Prerequisite:** Docker only (Docker Desktop on Windows/macOS, and it must be running). No .NET, Node or PostgreSQL install is needed.

```bash
docker compose up -d --build
```

| Service | URL |
|---|---|
| **Frontend** | **http://localhost:3000** |
| **Backend API** | **http://localhost:8080** |
| PostgreSQL (dev only) | `localhost:5433` (user / password / db: `admission`) |

- The first build downloads base images and packages and can take several minutes. Later starts take seconds.
- Database migrations run automatically when the backend starts.
- Check status with `docker compose ps` (db should be `healthy`).

Stop and reset:

```bash
docker compose down      # stop; data is kept in the pgdata volume
docker compose down -v   # stop and delete all data
```

## Using the app

1. **Enter your ID.** Type the 17-digit birth registration number in the box at the top (sidebar on desktop) and save it. Bengali digits are converted automatically. This ID identifies the student; there is no login.
2. **Create a class.** Open the admin page (*ক্লাস তৈরি (Admin)*, `/admin/classes/new`), enter a name and seat count (1–10000).
3. **Apply.** On the class list, press *আবেদন করুন*. A hold is created and you are taken to its page with a live countdown.
4. **Pay.** Press *ভর্তি ফি দিন* to simulate a successful payment. The hold becomes **CONFIRMED** and the seat is yours.
5. **Cancel.** A HELD application can be cancelled; the seat is released immediately.
6. **My applications.** The *আমার আবেদন* page (`/me`) lists all your holds with their status.

**On expiry:** when the countdown reaches zero the hold shows **EXPIRED**, the pay button disappears, and the seat is available again to everyone. The server enforces this; the UI only reflects it.

Seat counts on the list refresh every 3 seconds, so you can watch seats change while others apply.

## Running tests

| Suite | Docker (no local tools) | Local (optional) |
|---|---|---|
| Backend, 114 tests | `docker compose --profile test run --rm tests` | `cd backend && dotnet test` (.NET 10 SDK; dev DB running on port 5433) |
| Frontend, 142 tests | `docker compose --profile test run --rm frontend-test` | `cd frontend && pnpm install && pnpm test` (Node 22, pnpm 10) |

- Backend tests are integration tests against a real PostgreSQL. Each test class creates and drops its own database.
- The **concurrency test** fires 50 simultaneous hold requests at a class with 5 seats. Exactly 5 succeed and the rest get `409 NO_SEATS`. Other tests prove that 20 simultaneous requests from one student produce exactly one hold, and that 20 simultaneous confirms stay consistent.
- A **multi-instance test** runs two separate app hosts on one database and repeats the 50-on-5 check: exactly 5 succeed.
- Frontend tests render the real routes and hooks, with MSW in place of the backend.

## Multiple backend instances (bonus)

```bash
docker compose --profile multi up -d --build
```

A second backend runs at **http://localhost:8081** on the same database. Overbooking is prevented across processes because the seat check takes a PostgreSQL row lock (`SELECT … FOR UPDATE`) on the class inside a transaction, so the lock lives in the database, not in process memory. See [ASSUMPTIONS.md](ASSUMPTIONS.md). Stop it with `docker compose --profile multi stop backend2`.

## Configuration

Defaults work out of the box. To override, copy `.env.example` to `.env` and edit, or set variables in the shell.

| Variable | Default | Purpose |
|---|---|---|
| `ConnectionStrings__Default` | set by compose (`Host=db;Port=5432;…`) | Backend database connection |
| `HOLD_DURATION_SECONDS` | `600` | Hold length in seconds; must be > 0 or the backend refuses to start |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Allowed frontend origins (comma-separated) |
| `API_URL` | `http://localhost:8080` | Backend URL the browser calls (must be reachable from the host) |
| `FRONTEND_PORT` | `3000` | Host port for the frontend |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `admission` | Database credentials |
| `POSTGRES_PORT` | `5433` | Host port for PostgreSQL |
| `TEST_DB_CONNECTION` | `Host=localhost;Port=5433;…` (compose: `Host=db`) | Server used by backend tests |

Example: run with a 20-second hold to see expiry quickly.

```bash
HOLD_DURATION_SECONDS=20 docker compose up -d backend
```

```powershell
$env:HOLD_DURATION_SECONDS="20"; docker compose up -d backend
```

`API_URL` is written into `config.js` when the frontend container starts, so changing it needs only a container restart, not a rebuild:

```bash
API_URL=http://127.0.0.1:8080 docker compose up -d frontend
```

## API overview

| Method | Path | Header | Success | Main errors |
|---|---|---|---|---|
| POST | `/classes` | – | 201 | 400 `VALIDATION_ERROR` |
| GET | `/classes` | – | 200 | – |
| GET | `/classes/{classId}` | – | 200 | 404 `CLASS_NOT_FOUND` |
| POST | `/classes/{classId}/holds` | `X-Student-Id` | 201 | 400 `INVALID_STUDENT_ID`, 404 `CLASS_NOT_FOUND`, 409 `NO_SEATS` / `ALREADY_APPLIED` |
| GET | `/holds/{holdId}` | – | 200 | 404 `HOLD_NOT_FOUND` |
| POST | `/holds/{holdId}/confirm` | `X-Student-Id` | 200 | 400, 403 `FORBIDDEN`, 404, 409 `INVALID_HOLD_STATE` (expired/cancelled) |
| DELETE | `/holds/{holdId}` | `X-Student-Id` | 204 | 400, 403 `FORBIDDEN`, 404, 409 `INVALID_HOLD_STATE` (confirmed/expired) |
| GET | `/me/holds` | `X-Student-Id` | 200 | 400 `INVALID_STUDENT_ID` |

Class responses include `totalSeats`, `heldSeats`, `confirmedSeats` and `availableSeats`. Errors use `application/problem+json` (RFC 7807 ProblemDetails) with an extra `code` field:

```json
{"title":"CLASS_NOT_FOUND","status":404,"detail":"Class not found.","instance":"/classes/…","code":"CLASS_NOT_FOUND"}
```

Manual request samples are in [backend/requests.http](backend/requests.http).

## Project structure

```
backend/
  src/SchoolAdmission.Domain/          entities (SchoolClass, Hold), status rules, domain exceptions
  src/SchoolAdmission.Application/     use cases (ClassService, HoldService), DTOs, clock abstraction
  src/SchoolAdmission.Infrastructure/  EF Core DbContext, migrations, row locks, expired-hold sweeper
  src/SchoolAdmission.Api/             controllers, ProblemDetails error handler, validation, startup
  tests/SchoolAdmission.Tests/         integration tests (real PostgreSQL)
frontend/src/
  features/classes/                    class list, create class page
  features/holds/                      hold detail with countdown, my applications, cancel dialog
  features/student/                    student ID context (localStorage)
  components/  lib/  config/  test/    shared UI, API client and errors, runtime config, test setup
```

## Troubleshooting

| Problem | Fix |
|---|---|
| `port is already allocated` | Copy `.env.example` to `.env` and change `FRONTEND_PORT` or `POSTGRES_PORT`. If you change `FRONTEND_PORT`, add the new origin to `CORS_ORIGINS` (e.g. `http://localhost:4000`). Port 8080 is fixed in `docker-compose.yml`. |
| First build is slow | Expected: base images, NuGet and npm packages are downloaded once. |
| `cannot connect to the Docker daemon` | Start Docker Desktop and wait until it reports *running*. |
| UI shows "cannot fetch latest data" | Check that the backend is up: `docker compose ps`, `docker compose logs backend`. |

## More

- [ASSUMPTIONS.md](ASSUMPTIONS.md): design decisions and interpretations
- [AI_USAGE.md](AI_USAGE.md): how AI tools were used and verified
