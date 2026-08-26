# Database design — Seven Ministries EMS

This is the schema for the real, backend-connected version of the portal.
The app currently runs entirely on `js/data.js`, which stores everything in
the browser's `localStorage` — this schema is what that layer becomes once
there's a real backend behind it.

## The flow this schema supports

```
sevenministriesint.com/enrolment.html   (already exists — not part of this build)
              │
              │  form submission (General / After-School / Post-Secondary)
              ▼
        enrollments table             ← raw registration record, status='pending'
              │
              │  registrar reviews it, assigns class + subjects,
              │  confirms a fee payment in the portal
              ▼
        fee_payments table            ← INSERT
              │
              │  DATABASE TRIGGER (fn_issue_student_id) — automatic,
              │  no separate "issue ID" step to remember
              ▼
        students table                ← row created, portal_id generated
                                          (SMI-S-1004, ...), enrollment
                                          marked 'converted'
              │
              │  application layer emails portal_id + temp password
              ▼
        guardian receives credentials → student logs into the portal
```

The important design decision, matching what you asked for: **confirming
the fee payment *is* the action that issues the student ID.** There's no
separate manual "generate ID" button — see `fn_issue_student_id()` in
`schema.sql`.

## Teachers

Per your note — the registrar side just adds teachers directly. There's no
public teacher signup form; `teachers` rows are inserted straight from the
"Add Teacher" form in the Registrar's Teachers tab (already in `js/app.js`),
tracked by `added_by_admin_id`.

## Mapping `js/data.js` functions to this schema

The app's `Data` object is written as a clean data-access layer already —
each function below becomes an API call once there's a backend, with almost
no change to `app.js` itself:

| `js/data.js` function | Becomes (real backend) |
|---|---|
| `Data.findUser(id, password)` | `POST /api/auth/login` — checks `admins`/`teachers`/`students` by `portal_id`, verifies password hash, returns a session token |
| `Data.getPendingEnrollments()` | `GET /api/enrollments?status=pending` |
| `Data.recordFeePaymentForEnrollment(enrollmentId, {...})` | `POST /api/fee-payments` with `enrollment_id` — the `fn_issue_student_id` trigger does the rest server-side |
| `Data.addTeacher({...})` | `POST /api/teachers` (registrar-only) |
| `Data.addLesson(...)` / `addLiveClass(...)` / `addAssignment(...)` | `POST /api/lessons`, `/api/live-classes`, `/api/assignments` (teacher-only, scoped to their own `teacher_id`) |
| `Data.submitAssignment(...)` | `POST /api/submissions` (student-only) |
| `Data.gradeSubmission(...)` | `PATCH /api/submissions/:id` (teacher-only) |

## Connecting the website's enrolment form to this database

You have two options, depending on how sevenministriesint.com is built:

**Option A — direct API endpoint (recommended).** Stand up a small API
(Node/Express, PHP, etc.) with one endpoint, e.g. `POST /api/enrollments`,
that the website's form submits to. It just inserts a row into
`enrollments` — the columns map 1:1 to the fields already on that form.

**Option B — webhook/integration.** If the enrolment form goes through a
third-party form service (Formspree, Netlify Forms, a WordPress plugin),
most support a webhook on submit — point that at the same endpoint.

Either way, the website and this portal stay two separate systems joined by
one small integration point — you don't need to rebuild the website.

## Sending the login ID to the guardian

The trigger generates `students.portal_id` inside the database, but the
database can't send email on its own. Two common patterns:

- **Same-request**: if "confirm payment" goes through your API (not raw
  SQL), have that endpoint read back the newly created `portal_id` /
  temp password and email it synchronously.
- **Listener**: a small job that watches for new `students` rows (e.g.
  Postgres `LISTEN`/`NOTIFY`) and sends the email asynchronously.

## Passwords

`schema.sql` hashes the auto-generated temporary password with
`pgcrypto`'s `crypt()`/`gen_salt('bf')` before it's ever written to disk —
the plaintext only exists for the moment it's generated, to be emailed out.
Swap this for whatever hashing your backend framework already does
(bcrypt/argon2 in Node, Django's built-in hasher, etc.) rather than relying
on the database to do it, if you'd rather keep hashing in the app layer.

## MySQL note

If you end up on MySQL instead of Postgres:
- Swap `UUID PRIMARY KEY DEFAULT gen_random_uuid()` for `CHAR(36) PRIMARY KEY DEFAULT (UUID())` (MySQL 8+).
- Swap `TEXT[]` (classes/subjects arrays) for a join table (`teacher_classes`, `student_subjects`) — MySQL has no native array type.
- Swap standalone `ENUM` types for MySQL's inline `ENUM(...)` column syntax.
- Trigger syntax differs (`DELIMITER $$ ... END$$`), but the logic in `fn_issue_student_id()` carries over directly.
