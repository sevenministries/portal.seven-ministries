-- ============================================================================
-- Seven Ministries International — Education Management System
-- Database schema (PostgreSQL 14+)
--
-- This mirrors the data shape already used by js/data.js, so swapping the
-- localStorage layer for real API calls later is a close 1:1 mapping —
-- see database/README.md for the function-by-function migration notes.
--
-- Flow:
--   1. A family submits the enrolment form on sevenministriesint.com
--      (General / After-School / Post-Secondary) -> row inserted into
--      `enrollments`, status = 'pending'.
--   2. The registrar reviews it, assigns a class/subjects, and confirms a
--      fee payment in the portal -> row inserted into `fee_payments`.
--   3. A trigger on `fee_payments` automatically creates the `students` row,
--      generates a unique portal_id (e.g. SMI-S-1004) and password, and
--      marks the enrollment 'converted'.
--   4. The guardian is emailed the credentials (application-layer — see
--      database/README.md).
--
-- Registrars add teacher accounts directly (Registrar -> Teachers -> Add
-- Teacher) — there is no public teacher registration form.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- ----------------------------------------------------------------------------
-- ENUM TYPES
-- ----------------------------------------------------------------------------

CREATE TYPE program_type       AS ENUM ('general', 'after_school', 'post_secondary');
CREATE TYPE enrollment_status  AS ENUM ('pending', 'converted', 'rejected');
CREATE TYPE fees_status        AS ENUM ('paid', 'overdue');
CREATE TYPE lesson_source_type AS ENUM ('recorded', 'live'); -- kept for future use; lessons/live_classes are separate tables today, matching the app

-- ----------------------------------------------------------------------------
-- ENROLLMENTS  (raw submissions from the sevenministriesint.com form)
-- ----------------------------------------------------------------------------
-- Column names mirror the actual fields on /enrolment.html, so the website
-- can POST directly into this table via a small API endpoint.

CREATE TABLE enrollments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_type      program_type NOT NULL,
  status            enrollment_status NOT NULL DEFAULT 'pending',
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Parent / guardian
  email             TEXT NOT NULL,
  guardian_name     TEXT NOT NULL,
  phone             TEXT NOT NULL,
  address           TEXT NOT NULL,
  country           TEXT NOT NULL,

  -- Child
  child_name        TEXT NOT NULL,
  child_dob         DATE,
  child_age         INTEGER,
  current_school    TEXT,          -- After-School Club form only
  program_of_interest TEXT NOT NULL,

  notes             TEXT,
  converted_student_id UUID        -- filled in once the fee payment is confirmed
);

CREATE INDEX idx_enrollments_status ON enrollments(status);

-- ----------------------------------------------------------------------------
-- ADMINS (Registrar's Office staff)
-- ----------------------------------------------------------------------------

CREATE TABLE admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id     TEXT UNIQUE NOT NULL,     -- e.g. SMI-ADMIN
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- TEACHERS  (added directly by the registrar — Registrar > Teachers > Add Teacher)
-- ----------------------------------------------------------------------------

CREATE TABLE teachers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id     TEXT UNIQUE NOT NULL,      -- e.g. SMI-T-101
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  subjects      TEXT[] NOT NULL DEFAULT '{}', -- e.g. {"Mathematics","Further Mathematics"} — a teacher can teach more than one subject
  classes       TEXT[] NOT NULL DEFAULT '{}', -- e.g. {"Year 7","Year 8"}
  bio           TEXT,
  avatar_color  TEXT,
  added_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- STUDENTS
-- ----------------------------------------------------------------------------
-- A row is only ever created by the fn_issue_student_id() trigger below,
-- fired when a fee payment is confirmed against an enrollment.

CREATE TABLE students (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id      TEXT UNIQUE NOT NULL,     -- e.g. SMI-S-1004
  password_hash  TEXT NOT NULL,
  name           TEXT NOT NULL,
  class_name     TEXT NOT NULL,            -- e.g. "Year 8" (Year 1–12) — assigned by the registrar
  guardian       TEXT NOT NULL,
  fees_status    fees_status NOT NULL DEFAULT 'paid',
  subjects       TEXT[] NOT NULL DEFAULT '{}',
  avatar_color   TEXT,
  enrollment_id  UUID REFERENCES enrollments(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_students_class ON students(class_name);

ALTER TABLE enrollments
  ADD CONSTRAINT fk_enrollments_converted_student
  FOREIGN KEY (converted_student_id) REFERENCES students(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- FEE PAYMENTS  (confirming one of these is what issues the student ID)
-- ----------------------------------------------------------------------------

CREATE TABLE fee_payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id  UUID REFERENCES enrollments(id) ON DELETE SET NULL,
  student_id     UUID REFERENCES students(id) ON DELETE SET NULL,
  student_name   TEXT NOT NULL,       -- denormalized for a fast payment log, mirrors the app
  class_name     TEXT NOT NULL,
  amount         NUMERIC(12,2) NOT NULL,  -- GHS
  term           TEXT NOT NULL,           -- e.g. "Term 1, 2026"
  paid_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fee_payments_student ON fee_payments(student_id);

-- ----------------------------------------------------------------------------
-- LESSONS, LIVE CLASSES, ASSIGNMENTS, SUBMISSIONS
-- ----------------------------------------------------------------------------

CREATE TABLE lessons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  class_name  TEXT NOT NULL,
  title       TEXT NOT NULL,
  objectives  TEXT,
  content     TEXT,
  week        TEXT,               -- e.g. "Week 7"
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE live_classes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject         TEXT NOT NULL,
  class_name      TEXT NOT NULL,
  title           TEXT NOT NULL,
  room_link       TEXT NOT NULL,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_mins   INTEGER NOT NULL
);

CREATE TABLE assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject      TEXT NOT NULL,
  class_name   TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  due_date     TIMESTAMPTZ NOT NULL,
  max_score    INTEGER NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE submissions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id  UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  content        TEXT,
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  grade          NUMERIC(5,2),
  feedback       TEXT,
  graded_by_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  graded_at      TIMESTAMPTZ,
  UNIQUE(assignment_id, student_id)
);

-- ============================================================================
-- AUTOMATIC PORTAL ID GENERATION
--
-- Confirming a fee payment IS the action that issues the student's portal
-- ID — no separate manual step. Mirrors Data.recordFeePaymentForEnrollment()
-- in js/data.js.
-- ============================================================================

CREATE SEQUENCE student_portal_seq START 1004; -- continues from the seeded SMI-S-1001..1003

CREATE OR REPLACE FUNCTION fn_issue_student_id()
RETURNS TRIGGER AS $$
DECLARE
  v_enrollment  enrollments%ROWTYPE;
  v_portal_id   TEXT;
  v_temp_pw     TEXT;
  v_student_id  UUID;
BEGIN
  -- A payment must be tied to a pending enrollment
  SELECT * INTO v_enrollment FROM enrollments WHERE id = NEW.enrollment_id;

  IF v_enrollment.id IS NULL THEN
    RAISE EXCEPTION 'fee_payments.enrollment_id must reference a valid enrollment';
  END IF;

  IF v_enrollment.status = 'converted' THEN
    -- Enrollment already converted (e.g. a later term's payment) —
    -- just link this payment to the existing student, no new ID.
    NEW.student_id := v_enrollment.converted_student_id;
    SELECT name INTO NEW.student_name FROM students WHERE id = NEW.student_id;
    RETURN NEW;
  END IF;

  v_portal_id := 'SMI-S-' || nextval('student_portal_seq');
  v_temp_pw   := (ARRAY['Grace','Faith','Wisdom','Hope','Truth','Light','Peace','Honor'])[floor(random()*8+1)]
                 || floor(random()*900+100)::text;

  INSERT INTO students (portal_id, password_hash, name, class_name, guardian, fees_status, enrollment_id)
  VALUES (v_portal_id, crypt(v_temp_pw, gen_salt('bf')), v_enrollment.child_name,
          NEW.class_name, v_enrollment.guardian_name, 'paid', v_enrollment.id)
  RETURNING id INTO v_student_id;

  UPDATE enrollments
  SET status = 'converted', converted_student_id = v_student_id
  WHERE id = v_enrollment.id;

  NEW.student_id   := v_student_id;
  NEW.student_name := v_enrollment.child_name;

  -- The application layer picks this up (e.g. by checking for newly
  -- inserted `students` rows, or wrapping this whole flow in one API call)
  -- and emails v_portal_id / v_temp_pw to v_enrollment.email.
  -- The plaintext temp password is deliberately not stored anywhere —
  -- only its hash lands in students.password_hash.

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_issue_student_id
  BEFORE INSERT ON fee_payments
  FOR EACH ROW
  EXECUTE FUNCTION fn_issue_student_id();
