-- =====================================================================
-- Migration 002 — Supporting tables
-- =====================================================================
-- Adds the four tables named in PRD §19 and required by docs/api_spec.md,
-- docs/security.md, and the verification workflow in docs/data_workflow.md:
--
--   roles               role lookup
--   users               authentication + role assignment
--   alumni_submissions  the Pending → Approved gate
--   audit_logs          append-only record of administrative action
--
-- Prerequisite: 001_core_constraints.sql
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------
-- A lookup table rather than a bare CHECK, because permissions are read by
-- the API on every request and adding a fourth role (e.g. a department head
-- with partial write access) should be a data change, not a migration.

CREATE TABLE IF NOT EXISTS roles (
    role_code    VARCHAR(20) PRIMARY KEY,
    display_name VARCHAR(50) NOT NULL,
    description  TEXT
);

INSERT INTO roles (role_code, display_name, description) VALUES
    ('alumni',  'Alumni',        'Own profile only. Changes go through the submission queue; cannot write official records.'),
    ('faculty', 'Faculty',       'Read-only: directory, profiles, analytics. No write path anywhere in the API.'),
    ('admin',   'Administrator', 'Full record management, submission verification, user management, audit access.')
ON CONFLICT (role_code) DO NOTHING;

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    user_id       BIGSERIAL PRIMARY KEY,
    role_code     VARCHAR(20)  NOT NULL,
    -- Set only for alumni accounts; links the login to the alumni record.
    student_id    VARCHAR(7),
    email         VARCHAR(255) NOT NULL,
    password_hash TEXT         NOT NULL,
    full_name     VARCHAR(200),
    status        VARCHAR(30)  NOT NULL DEFAULT 'pending_verification',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ,

    CONSTRAINT fk_users_role
        FOREIGN KEY (role_code) REFERENCES roles(role_code)
        ON UPDATE CASCADE,

    CONSTRAINT fk_users_alumni
        FOREIGN KEY (student_id) REFERENCES alumni(student_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT chk_users_status
        CHECK (status IN ('active', 'pending_verification', 'deactivated')),

    -- An alumni account must be linked to an alumni record; faculty and
    -- admin accounts must not be. This is what makes "alumni can only see
    -- their own record" enforceable at the database level rather than
    -- resting on API logic alone.
    CONSTRAINT chk_users_student_link
        CHECK (
            (role_code = 'alumni'  AND student_id IS NOT NULL) OR
            (role_code <> 'alumni' AND student_id IS NULL)
        )
);

-- One login per person, one account per alumnus (profile claiming, PRD §7.1).
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower ON users (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_student_id  ON users (student_id)
    WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role_code, status);

-- ---------------------------------------------------------------------
-- alumni_submissions
-- ---------------------------------------------------------------------
-- The verification gate. Alumni writes land here, never in the four core
-- tables. Only an Approved transition copies values across.
--
-- current_values / proposed_values are JSONB so one table serves every
-- submission type without a column per field, and so the admin review panel
-- can render a generic "Current → Proposed" diff (PRD §10).

CREATE TABLE IF NOT EXISTS alumni_submissions (
    submission_id   BIGSERIAL PRIMARY KEY,
    student_id      VARCHAR(7)  NOT NULL,
    submitted_by    BIGINT      NOT NULL,
    submission_type VARCHAR(30) NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'Pending',

    -- Snapshot of the official values at submission time, so the reviewer
    -- sees what the alumnus was actually looking at, not what the record
    -- says now.
    current_values  JSONB,
    proposed_values JSONB       NOT NULL,

    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_by     BIGINT,
    reviewed_at     TIMESTAMPTZ,
    review_note     TEXT,
    applied_at      TIMESTAMPTZ,

    CONSTRAINT fk_submissions_alumni
        FOREIGN KEY (student_id) REFERENCES alumni(student_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_submissions_submitter
        FOREIGN KEY (submitted_by) REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_submissions_reviewer
        FOREIGN KEY (reviewed_by) REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_submission_type
        CHECK (submission_type IN (
            'personal', 'contact', 'academic', 'internship',
            'research_interest', 'employment', 'employment_history'
        )),

    CONSTRAINT chk_submission_status
        CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Correction Required')),

    -- A pending submission has not been reviewed; a resolved one has.
    CONSTRAINT chk_submission_review_state
        CHECK (
            (status = 'Pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
            OR (status <> 'Pending' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
        ),

    -- A rejection or correction request must tell the alumnus why
    -- (docs/api_spec.md makes reason/comments required on those endpoints).
    CONSTRAINT chk_submission_reason
        CHECK (
            status NOT IN ('Rejected', 'Correction Required')
            OR review_note IS NOT NULL
        ),

    -- Only an approval writes to the official tables.
    CONSTRAINT chk_submission_applied
        CHECK ((status = 'Approved') = (applied_at IS NOT NULL))
);

-- The Verification Center's default view: pending work, oldest first.
CREATE INDEX IF NOT EXISTS idx_submissions_queue
    ON alumni_submissions (status, submitted_at);
-- An alumnus's own submission history.
CREATE INDEX IF NOT EXISTS idx_submissions_student
    ON alumni_submissions (student_id, submitted_at DESC);

-- ---------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------
-- Append-only. actor_email is denormalised deliberately: a log entry must
-- stay readable after the user account is deactivated or removed, so it does
-- not depend on a join surviving.

CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id     BIGSERIAL PRIMARY KEY,
    actor_user_id BIGINT,
    actor_email  VARCHAR(255) NOT NULL,
    actor_role   VARCHAR(20)  NOT NULL,
    action       VARCHAR(100) NOT NULL,
    table_name   VARCHAR(50),
    record_id    VARCHAR(50),
    old_values   JSONB,
    new_values   JSONB,
    occurred_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_audit_user
        FOREIGN KEY (actor_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_record   ON audit_logs (record_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor    ON audit_logs (actor_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_occurred ON audit_logs (occurred_at DESC);

-- Enforce append-only at the database level, not just by convention.
-- docs/security.md §6 requires audit logs to be non-editable through the
-- application; a trigger means an API bug cannot quietly rewrite history.
CREATE OR REPLACE FUNCTION audit_logs_append_only()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_no_update ON audit_logs;
CREATE TRIGGER trg_audit_no_update
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION audit_logs_append_only();

-- TRUNCATE bypasses row-level triggers entirely, so it needs its own
-- statement-level trigger — otherwise a single TRUNCATE would erase the
-- whole audit trail while the row trigger above sat unfired.
DROP TRIGGER IF EXISTS trg_audit_no_truncate ON audit_logs;
CREATE TRIGGER trg_audit_no_truncate
    BEFORE TRUNCATE ON audit_logs
    FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_append_only();

COMMIT;
