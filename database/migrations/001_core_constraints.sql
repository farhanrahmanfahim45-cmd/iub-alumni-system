-- =====================================================================
-- Migration 001 — Core table constraint corrections
-- =====================================================================
-- Addresses the open items in docs/data_cleaning_changelog.md.
-- Run against a database already created from database/schema.sql.
--
--   psql -U <app_user> -d <db> -f database/migrations/001_core_constraints.sql
--
-- Every statement is idempotent (safe to re-run).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. personal_email: allow real post-graduation addresses
-- ---------------------------------------------------------------------
-- The original chk_email pinned personal_email to @iub.edu.bd, which makes
-- the alumni self-service update flow impossible — an alumnus's whole reason
-- for updating contact details is that their institutional address has
-- lapsed. Institutional email now has its own column, and the domain
-- constraint moves there.
--
-- DEPARTMENTAL DECISION REQUIRED before applying: this changes what
-- personal_email is allowed to contain. If the department instead wants
-- personal_email to stay institution-only, skip this section.

ALTER TABLE alumni DROP CONSTRAINT IF EXISTS chk_email;
ALTER TABLE alumni DROP CONSTRAINT IF EXISTS chk_personal_email;

ALTER TABLE alumni
    ADD CONSTRAINT chk_personal_email
    CHECK (personal_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Case-insensitive uniqueness. Without this, alumni083@iub.edu.bd and
-- Alumni083@iub.edu.bd are two separate alumni.
CREATE UNIQUE INDEX IF NOT EXISTS uq_alumni_personal_email_lower
    ON alumni (LOWER(personal_email));

ALTER TABLE alumni
    ADD COLUMN IF NOT EXISTS institutional_email VARCHAR(255);

ALTER TABLE alumni DROP CONSTRAINT IF EXISTS chk_institutional_email;
ALTER TABLE alumni
    ADD CONSTRAINT chk_institutional_email
    CHECK (institutional_email IS NULL
           OR institutional_email ~ '^[^@]+@iub\.edu\.bd$');

CREATE UNIQUE INDEX IF NOT EXISTS uq_alumni_institutional_email_lower
    ON alumni (LOWER(institutional_email));

-- ---------------------------------------------------------------------
-- 2. minor must not duplicate major
-- ---------------------------------------------------------------------
-- A student cannot minor in their own major. Prevents the double-counting
-- that inflated the IB Minors KPI (see changelog §4).

ALTER TABLE alumni DROP CONSTRAINT IF EXISTS chk_minor_not_major;
ALTER TABLE alumni
    ADD CONSTRAINT chk_minor_not_major
    CHECK (minor IS NULL OR minor <> major);

-- ---------------------------------------------------------------------
-- 3. Enforce the 1:1 relationships
-- ---------------------------------------------------------------------
-- academic_records and employment are one-row-per-alumnus in practice but
-- nothing stopped a second row, which would silently double every
-- dashboard aggregate that joins them.

CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_student
    ON academic_records (student_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_employment_student
    ON employment (student_id);

-- ---------------------------------------------------------------------
-- 4. Controlled vocabularies the schema left open
-- ---------------------------------------------------------------------
-- degree was an unconstrained VARCHAR(20), so a typo ('BBa') would create a
-- phantom category in the Degree Distribution chart. Values are the seven
-- observed in the dataset; extend the list rather than dropping the check.

ALTER TABLE alumni DROP CONSTRAINT IF EXISTS chk_degree;
ALTER TABLE alumni
    ADD CONSTRAINT chk_degree
    CHECK (degree IN ('BBA', 'BSc', 'B.Pharm', 'BA', 'BSS', 'B.Eng', 'LLB'));

-- Years must be plausible. Open-ended upper bound allows for expected
-- graduation dates already present in the dataset (up to 2027).
ALTER TABLE alumni DROP CONSTRAINT IF EXISTS chk_year_range;
ALTER TABLE alumni
    ADD CONSTRAINT chk_year_range
    CHECK (
        (admission_year IS NULL OR admission_year BETWEEN 1993 AND 2100)
        AND (graduation_year IS NULL OR graduation_year BETWEEN 1993 AND 2100)
    );

-- ---------------------------------------------------------------------
-- 5. Employment status ↔ employer field consistency
-- ---------------------------------------------------------------------
-- Verified true in all 500 rows but never enforced: 'Seeking Employment'
-- and 'Further Studies' carry no employer data; 'Employed' and
-- 'Self-Employed' must name a company.

ALTER TABLE employment DROP CONSTRAINT IF EXISTS chk_status_employer_fields;
ALTER TABLE employment
    ADD CONSTRAINT chk_status_employer_fields
    CHECK (
        CASE employment_status
            WHEN 'Employed'      THEN company IS NOT NULL
            WHEN 'Self-Employed' THEN company IS NOT NULL
            ELSE company IS NULL
                 AND job_title IS NULL
                 AND industry IS NULL
                 AND job_function IS NULL
                 AND country IS NULL
                 AND city IS NULL
                 AND start_year IS NULL
        END
    );

-- ---------------------------------------------------------------------
-- 6. Internship field consistency
-- ---------------------------------------------------------------------
-- internship_completed = 'No' must not carry internship details.
-- NOTE: the BBA-must-have-an-internship rule is deliberately NOT a CHECK
-- here — it spans two tables, so PostgreSQL cannot express it. It is
-- enforced in the API layer and in load_data.py.

ALTER TABLE academic_records DROP CONSTRAINT IF EXISTS chk_internship_fields;
ALTER TABLE academic_records
    ADD CONSTRAINT chk_internship_fields
    CHECK (
        internship_completed <> 'No'
        OR (internship_organization IS NULL
            AND internship_position IS NULL
            AND internship_industry IS NULL)
    );

-- ---------------------------------------------------------------------
-- 7. Cascade behaviour on the foreign keys
-- ---------------------------------------------------------------------
-- Without this, deleting an alumnus fails on the child rows. The system
-- prefers deactivation over deletion, but where a record genuinely must be
-- removed (duplicate resolution), the children should go with it.

ALTER TABLE academic_records DROP CONSTRAINT IF EXISTS fk_academic_alumni;
ALTER TABLE academic_records
    ADD CONSTRAINT fk_academic_alumni
    FOREIGN KEY (student_id) REFERENCES alumni(student_id)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE employment DROP CONSTRAINT IF EXISTS fk_employment_alumni;
ALTER TABLE employment
    ADD CONSTRAINT fk_employment_alumni
    FOREIGN KEY (student_id) REFERENCES alumni(student_id)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE employment_history DROP CONSTRAINT IF EXISTS fk_history_alumni;
ALTER TABLE employment_history
    ADD CONSTRAINT fk_history_alumni
    FOREIGN KEY (student_id) REFERENCES alumni(student_id)
    ON UPDATE CASCADE ON DELETE CASCADE;

-- ---------------------------------------------------------------------
-- 8. Record status for deactivation (DELETE /api/alumni/{id})
-- ---------------------------------------------------------------------
-- The API specifies a soft delete. Nothing in the schema supported it.

ALTER TABLE alumni
    ADD COLUMN IF NOT EXISTS record_status VARCHAR(20) NOT NULL DEFAULT 'active';

ALTER TABLE alumni DROP CONSTRAINT IF EXISTS chk_record_status;
ALTER TABLE alumni
    ADD CONSTRAINT chk_record_status
    CHECK (record_status IN ('active', 'deactivated', 'merged'));

-- ---------------------------------------------------------------------
-- 9. Indexes for the directory and dashboards
-- ---------------------------------------------------------------------
-- Directory search (PRD §11) and dashboard filters (§16–17) run on every
-- keystroke and filter change. At 500 rows a sequential scan is fine; these
-- exist so the queries stay flat as the table grows toward real enrolment
-- numbers.

CREATE INDEX IF NOT EXISTS idx_alumni_name_lower
    ON alumni (LOWER(first_name), LOWER(last_name));
CREATE INDEX IF NOT EXISTS idx_alumni_graduation_year ON alumni (graduation_year);
CREATE INDEX IF NOT EXISTS idx_alumni_degree_major    ON alumni (degree, major);
CREATE INDEX IF NOT EXISTS idx_alumni_minor           ON alumni (minor);

CREATE INDEX IF NOT EXISTS idx_employment_status   ON employment (employment_status);
CREATE INDEX IF NOT EXISTS idx_employment_industry ON employment (industry);
CREATE INDEX IF NOT EXISTS idx_employment_country  ON employment (country);
CREATE INDEX IF NOT EXISTS idx_employment_company_lower ON employment (LOWER(company));

CREATE INDEX IF NOT EXISTS idx_history_student ON employment_history (student_id, start_year DESC);

COMMIT;
