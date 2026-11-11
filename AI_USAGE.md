# AI usage

## Tools used

- **Claude (chat):** reading and breaking down the requirements, planning the architecture, and writing step-by-step task prompts.
- **Claude Code (CLI, in the VS Code terminal):** implementing code, tests, Dockerfiles and documentation from those prompts, and running builds and tests.

## Where AI was used

| Area | What AI did |
|---|---|
| Backend layers | Generated the Domain, Application, Infrastructure and Api projects, entities, services, controllers, EF Core configuration and migration |
| Concurrency | Implemented the `SELECT … FOR UPDATE` transaction flow, the partial unique index, and hold-row locks for confirm/cancel |
| Error handling | Global ProblemDetails handler with `code`, status mapping, cleaned validation errors |
| Backend tests | 114 xUnit integration tests on real PostgreSQL, including the concurrency and two-host tests |
| Docker | Multi-stage Dockerfiles, compose services and profiles (`multi`, `test`), runtime `config.js` script |
| Frontend scaffold | Vite + React + Tailwind + shadcn setup, API client, student ID context |
| Screens | Class list, create class, hold detail with countdown, my applications, cancel dialog |
| Frontend tests | 142 Vitest / Testing Library / MSW tests |
| UI polish | Layout redesign, colour palette, spacing and radius clean-up |
| Docs | README, ASSUMPTIONS and this file, drafted from the test log and code |

## What I did myself

- Chose the architecture and stack (Clean Architecture, PostgreSQL row locks, React Query polling).
- Decided status-code semantics (403 vs 404 vs 409, idempotent confirm and cancel).
- Split the work into small tasks.
- Reviewed every diff in VS Code Source Control before committing.
- Ran builds, tests and manual checks (curl, browser, Docker), and judged UI quality, asking for a redesign when it was not good enough.

## Where AI was wrong and how it was caught

| Problem | How it was caught | Fix |
|---|---|---|
| EF Core Relational version conflict between packages | Build warning | Added `Microsoft.EntityFrameworkCore.Relational` 10.0.14 explicitly |
| Assumed the DB on port 5432 while a local PostgreSQL already used it, causing password authentication failure | First `dotnet run` | Moved the Docker DB to host port 5433 |
| `expiresAt` had 7 fractional digits in POST but 6 in GET | Manual curl comparison (the tests' fake clock started on whole seconds) | Truncate all timestamps to microseconds; added a test that uses sub-microsecond ticks |
| Validation errors leaked .NET type names, JSON paths and a duplicate "request field is required" | Manual curl review of 400 responses | `ValidationErrors.Clean`: friendly messages, normalized keys; 14 new test cases |
| Runtime image missing `libgssapi_krb5`, so an error appeared in backend logs | `docker compose logs backend` | `GSS Encryption Mode=Disable` in the Docker connection strings |
| MSW 3 renamed `onUnhandledRequest`; the old key was silently ignored, so the "no unhandled requests" guard was off | `pnpm typecheck` (tests were green) | Used `onUnhandledFrame: 'error'` and added a guard test |
| Toasts from one test reappeared in the next (sonner keeps global state) | "Found multiple elements" test failure | `toast.dismiss()` in `afterEach` |
| Navigation asserted too early (React Router transitions) | Test failure | `waitFor` on the location |
| Typing 201 characters timed out under coverage | `pnpm test:coverage` | `user.paste` instead of `user.type` |
| `setState` inside an effect in `useCountdown`; `Date` call during render | Lint (`set-state-in-effect`, `purity`) | First tick via `setTimeout`; year computed once at module level |
| Stray Cyrillic/Arabic letters in code comments | Review, then a script scan of `src` | Replaced and re-scanned |
| First UI polish was too subtle | Manual review of screenshots | Full layout redesign, then a final palette and radius pass |

## How AI output was verified

- **Automated tests:** backend 114/114 and frontend 142/142, run locally and in Docker.
- **Concurrency:** 50 parallel requests on 5 seats → exactly 5 holds, also with two app hosts on one database.
- **Multi-instance:** two backend containers (8080 and 8081) on one database gave consistent seat counts and no overbooking.
- **Clean run:** `docker compose down -v`, then `up -d --build`, then a curl flow (create, hold, confirm, my holds) and both test suites.
- **Manual UI checks:** a checklist of the main flows in the browser, including expiry, races between two tabs and backend down.
- **Code review:** every diff was read before commit, and every root cause was investigated rather than hidden by larger timeouts.
