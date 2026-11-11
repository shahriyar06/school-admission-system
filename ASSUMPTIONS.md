# Assumptions and design decisions

## Domain

- **Each shift is a separate class** (e.g. *Class 6 – Morning Shift*). This keeps one seat pool per class and needs no extra entity.
- **Student identity = 17 ASCII digits** (birth registration number) sent in `X-Student-Id`. Surrounding spaces are trimmed; Unicode digits are rejected. There is no authentication.
- **Class limits:** name is 1–200 characters after trimming; `totalSeats` is 1–10000.
- **Payment is simulated:** *ভর্তি ফি দিন* means a successful payment and calls `POST /holds/{id}/confirm`. There is no payment gateway.

## Holds

- **One active hold per student per class.** HELD or CONFIRMED counts as active, so a student can re-apply after an expiry or cancellation.
- **Confirm is idempotent.** Confirming a CONFIRMED hold returns 200 and changes nothing. A hold that was confirmed stays CONFIRMED after its expiry time.
- **Cancel works only on HELD holds.** CONFIRMED or EXPIRED returns 409 `INVALID_HOLD_STATE`. Cancelling an already-cancelled hold is a no-op 204.
- **Ownership is checked before state:** another student's hold always returns 403, whatever its status.
- **`GET /holds/{id}` needs no header.** GUIDs are unguessable, and this lets a hold page be opened from a link. Create, confirm, cancel and `/me/holds` require `X-Student-Id`.
- **Responses carry extra fields** (`className`, `studentId`) so the UI needs no second request.

## HTTP status mapping

| Status | When | Why |
|---|---|---|
| 400 | Invalid/missing student ID, invalid class input, malformed or wrong-type JSON | Client input error; body has `code` and clean per-field `errors` (no .NET type names) |
| 403 | Confirm/cancel another student's hold | The hold exists, but the caller does not own it |
| 404 | Unknown class or hold; malformed GUID in the route | `:guid` route constraint, so a bad GUID is simply "no such resource" |
| 409 | `NO_SEATS`, `ALREADY_APPLIED`, `INVALID_HOLD_STATE` | The request is valid but conflicts with current state |
| 415 / 405 | Missing `Content-Type`, wrong method | Framework defaults; still 4xx, never 500 |

## Concurrency (no overbooking, works across instances)

- **Row lock on the class.** Hold creation runs in a transaction that starts with `SELECT … FROM classes WHERE id = … FOR UPDATE`. Requests for the same class queue in PostgreSQL; other classes are not blocked.
- **Count and insert happen after the lock.** Under READ COMMITTED each statement sees rows committed by the previous lock holder, so the seat count is exact.
- **Database-level safety net:** the partial unique index `ux_holds_active_student_per_class` on `(class_id, student_id)` `WHERE status IN ('HELD','CONFIRMED')`. A violation maps to 409 `ALREADY_APPLIED`.
- **Confirm and cancel lock the hold row**, so a parallel confirm and cancel cannot both succeed.
- **No in-memory locks.** They would not protect a second process. The database lock covers any number of backend instances.
- **Proven by tests:** 50 parallel holds on 5 seats → exactly 5 succeed; the same check with two app hosts on one database; 20 parallel holds by one student → 1 succeeds; 20 parallel confirms → consistent. Also checked manually with two containers (ports 8080 and 8081).

## Expiry

- **Effective status on the server:** a HELD hold past `expires_at` is treated as EXPIRED in every count, query and response, so correctness does not depend on a background job.
- **Background sweeper** runs every 5 seconds and persists EXPIRED. Hold creation also expires stale holds of that class inside the lock.
- **Time is read after the lock is acquired**, so waiting for the lock cannot produce a hold that is already expired.
- **Timestamps are UTC, truncated to microseconds** (PostgreSQL `timestamptz` precision), so the create response and later reads return the same string.
- **Hold duration:** `HOLD_DURATION_SECONDS` (default 600). Zero or negative values stop the backend at startup.

## Persistence and operations

- **Migrations run at startup.** EF Core's migration lock makes simultaneous starts of two instances safe.
- **Data lives in the named volume `pgdata`.** It survives `docker compose down` and is removed by `down -v`.
- **`GSS Encryption Mode=Disable`** in Docker connection strings: the ASP.NET runtime image has no `libgssapi`, and Kerberos is not needed on the private Docker network.
- **The database is published on host port 5433** to avoid clashing with a local PostgreSQL on 5432. Inside Docker it is `db:5432`.

## Frontend

- **Runtime `config.js` provides `API_URL`.** Vite env values are fixed at build time, so the container writes `window.__ENV__` on start. Order: runtime config → `VITE_API_URL` → `http://localhost:8080`.
- **Polling:** classes every 3 s; hold detail every 5 s while HELD; my applications every 5 s; plus a refetch on window focus.
- **The countdown uses the browser clock.** Small clock skew is possible, but the server stays authoritative: a late confirm gets 409 and the UI refetches.
- **Student ID is kept in `localStorage`** and synced across tabs. Bengali digits are converted to ASCII.
- **No automatic retry for mutations** (no double holds/confirms). Queries do not retry on 4xx and retry at most twice on network/5xx errors.
- **The UI is in Bengali.** Backend error `code`s map to Bengali messages; times are shown in `Asia/Dhaka`. When the server is down the last data stays visible with an error, never a blank page.
- **No quick confirm/cancel on *My applications*.** Rows link to the detail page, so the rules live in one place. There is no dark mode.


## Additional decisions

### Student ID format
- **Decision:** `X-Student-Id` is validated only as **exactly 17 ASCII digits**. Leading zeros are allowed.
- **Why:** The brief only specifies a 17-digit birth registration number. In practice, Bangladeshi 17-digit birth registration numbers usually start with the 4-digit birth year (e.g. `2015…`), but enforcing a year prefix is not part of the brief and could reject IDs that automated API tests treat as valid.
- **Implementation note:** The ID is stored and compared as a **string** (`char(17)`), never as a number, so leading zeros are preserved.

### One active application per class (Rule 3) — scope
- **Decision:** The "one active (HELD or CONFIRMED) application" rule is enforced **per class**, and each shift is its own class, as the brief defines.

| Situation | Result |
|---|---|
| Student already has an active hold in *Class 6 – Morning*, applies to *Class 6 – Morning* again | `409 ALREADY_APPLIED` |
| Student has an active hold in *Class 6 – Morning*, applies to *Class 6 – Day* | `201` (allowed) |
| Student has an active hold in Class 6, applies to another grade (e.g. Class 7) | `201` (allowed) |

- **Why:** Restricting a student to a single grade would be realistic, but the API has no grade field (a class is only `name` + `totalSeats`). Enforcing it would mean guessing the grade from free-text class names, which is fragile (e.g. "Class 6 – Morning", "Six Morning", "ষষ্ঠ শ্রেণি"), and it would reject requests the brief considers valid.
- **Future extension:** Add an explicit `grade` field to classes and enforce "one active application per grade" in the same locked transaction that already enforces the per-class rule.