-- =====================================================================
-- Migration 003 — Least-privilege application role
-- =====================================================================
-- docs/security.md §3 requires the application to connect as a dedicated,
-- least-privilege user rather than the PostgreSQL superuser. This creates
-- that role and grants it only what FastAPI actually needs.
--
-- Run as a superuser (postgres), once per database:
--
--   psql -U postgres -d iub_alumni -f database/migrations/003_app_role.sql
--
-- Then set DB_USER=iub_app and DB_PASSWORD=<the value below> in .env, and
-- never use the postgres superuser in application configuration.
--
-- CHANGE THE PASSWORD BELOW BEFORE RUNNING. Do not commit the real one —
-- it belongs in .env only, which .gitignore already excludes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. The application role
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'iub_app') THEN
        CREATE ROLE iub_app LOGIN PASSWORD 'tablefun'
            NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
    END IF;
END
$$;

-- ---------------------------------------------------------------------
-- 2. Connect and schema usage
-- ---------------------------------------------------------------------
-- GRANT CONNECT needs a literal database name, so it is issued dynamically
-- against whichever database this script is run in.
DO $$
BEGIN
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO iub_app', current_database());
END
$$;

GRANT USAGE ON SCHEMA public TO iub_app;

-- No CREATE on the schema: the application cannot add or drop tables.
-- Migrations are run deliberately, as a superuser, not by the running app.
REVOKE CREATE ON SCHEMA public FROM iub_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- ---------------------------------------------------------------------
-- 3. Table privileges
-- ---------------------------------------------------------------------
-- Core alumni tables: full DML. The application legitimately needs to
-- insert, update, and (for duplicate resolution) delete these rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON
    alumni,
    academic_records,
    employment,
    employment_history,
    users,
    alumni_submissions
TO iub_app;

-- Audit logs: INSERT and SELECT only. No UPDATE, no DELETE — the
-- append-only trigger enforces this too, but a privilege that was never
-- granted cannot be exercised by a bug either.
GRANT SELECT, INSERT ON audit_logs TO iub_app;

-- Roles lookup: read-only. Adding a role is an administrative decision, not
-- something the running application should be able to do.
GRANT SELECT ON roles TO iub_app;

-- ---------------------------------------------------------------------
-- 4. Sequence privileges
-- ---------------------------------------------------------------------
-- BIGSERIAL columns need USAGE on their sequence or every INSERT fails.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO iub_app;

-- ---------------------------------------------------------------------
-- 5. Defaults for anything added later
-- ---------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO iub_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO iub_app;

-- ---------------------------------------------------------------------
-- 6. Verify
-- ---------------------------------------------------------------------
-- Expect audit_logs to show INSERT and SELECT only.
SELECT table_name, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS granted
FROM information_schema.table_privileges
WHERE grantee = 'iub_app'
GROUP BY table_name
ORDER BY table_name;
