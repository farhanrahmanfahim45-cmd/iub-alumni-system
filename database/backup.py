"""
Database backup (docs/security.md §7).

    python database/backup.py                      # write a backup
    python database/backup.py --list               # show what's kept
    python database/backup.py --verify <file>      # check one restores cleanly

Reads connection settings from .env, so no credentials appear here or on the
command line — pg_dump gets the password through PGPASSWORD in the child
process environment, not as an argument, because arguments are visible to
anyone who can list processes.

Backups are written to BACKUP_DIR, which should be on **different storage
from the database machine**. A backup sitting on the same disk as production
is not a backup — it dies in the same disk failure. The script warns if the
path looks like it's on the same volume.

Schedule it with Task Scheduler on Windows or cron on Linux, daily.
"""

import argparse
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

REQUIRED = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"]
KEEP = int(os.getenv("BACKUP_KEEP", "14"))
BACKUP_DIR = Path(os.getenv("BACKUP_DIR", "backups")).expanduser()


def settings() -> dict:
    missing = [k for k in REQUIRED if not os.getenv(k)]
    if missing:
        sys.exit(f"Missing in .env: {', '.join(missing)}")
    return {k: os.getenv(k) for k in REQUIRED}


def pg_env(cfg: dict) -> dict:
    env = os.environ.copy()
    env["PGPASSWORD"] = cfg["DB_PASSWORD"]
    return env


def run(cmd: list[str], cfg: dict) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, env=pg_env(cfg), capture_output=True, text=True)


def create_backup(cfg: dict) -> Path:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    if BACKUP_DIR.resolve().is_relative_to(Path.cwd()):
        print(
            "WARNING: BACKUP_DIR is inside the project folder. Point it at "
            "separate storage — a backup on the same disk as production is "
            "not a backup (docs/security.md §7).\n"
        )

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%SZ")
    target = BACKUP_DIR / f"{cfg['DB_NAME']}-{stamp}.dump"

    # Custom format (-Fc): compressed, and restorable selectively with
    # pg_restore rather than being one long SQL script.
    result = run(
        [
            "pg_dump",
            "-h", cfg["DB_HOST"],
            "-p", str(cfg["DB_PORT"]),
            "-U", cfg["DB_USER"],
            "-d", cfg["DB_NAME"],
            "-Fc",
            "--no-owner",
            "-f", str(target),
        ],
        cfg,
    )

    if result.returncode != 0:
        # Don't leave a truncated file that looks like a good backup.
        target.unlink(missing_ok=True)
        sys.exit(f"pg_dump failed:\n{result.stderr.strip()}")

    size_mb = target.stat().st_size / 1_048_576
    print(f"Wrote {target}  ({size_mb:.1f} MB)")

    # A dump that can't be listed can't be restored. Catch that now, not
    # during an incident.
    check = run(["pg_restore", "--list", str(target)], cfg)
    if check.returncode != 0:
        sys.exit(f"The backup was written but is unreadable:\n{check.stderr.strip()}")
    tables = sum(1 for line in check.stdout.splitlines() if " TABLE DATA " in line)
    print(f"Verified: readable, {tables} tables with data.")

    return target


def prune() -> None:
    backups = sorted(BACKUP_DIR.glob("*.dump"), key=lambda p: p.stat().st_mtime)
    for old in backups[:-KEEP] if len(backups) > KEEP else []:
        old.unlink()
        print(f"Removed old backup {old.name}")


def list_backups() -> None:
    backups = sorted(BACKUP_DIR.glob("*.dump"), key=lambda p: p.stat().st_mtime)
    if not backups:
        print(f"No backups in {BACKUP_DIR.resolve()}")
        return
    print(f"{len(backups)} backup(s) in {BACKUP_DIR.resolve()}, keeping {KEEP}:")
    for path in backups:
        when = datetime.fromtimestamp(path.stat().st_mtime, timezone.utc)
        print(f"  {when:%Y-%m-%d %H:%M}Z  {path.stat().st_size / 1_048_576:7.1f} MB  {path.name}")


def verify(cfg: dict, path: str) -> None:
    result = run(["pg_restore", "--list", path], cfg)
    if result.returncode != 0:
        sys.exit(f"Not restorable:\n{result.stderr.strip()}")
    entries = [line for line in result.stdout.splitlines() if not line.startswith(";")]
    print(f"{path} is restorable — {len(entries)} objects.")
    print("\nTo restore into a fresh database:")
    print(f"  createdb -U postgres {cfg['DB_NAME']}_restored")
    print(f"  pg_restore -U postgres -d {cfg['DB_NAME']}_restored --no-owner {path}")
    print("\nRestore into a *new* database and check it before touching production.")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true", help="show retained backups")
    ap.add_argument("--verify", metavar="FILE", help="check a backup is restorable")
    args = ap.parse_args()

    cfg = settings()

    if args.list:
        list_backups()
    elif args.verify:
        verify(cfg, args.verify)
    else:
        create_backup(cfg)
        prune()


if __name__ == "__main__":
    main()
