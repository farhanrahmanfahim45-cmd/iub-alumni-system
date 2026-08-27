"""
Audit logging (docs/security.md §6).

`write_audit` takes a cursor rather than opening its own connection, so the
audit entry commits in the same transaction as the change it describes. An
approved submission and its log line succeed together or fail together —
there is no path that updates an official record without leaving a trace.

The table itself is append-only: migration 002 adds triggers that reject
UPDATE, DELETE, and TRUNCATE, and migration 003 never grants the application
role those privileges.
"""

import json
from typing import Any

from psycopg.types.json import Jsonb

from app.core.security import CurrentUser


def write_audit(
    cur,
    actor: CurrentUser,
    action: str,
    table_name: str | None = None,
    record_id: str | None = None,
    old_values: dict[str, Any] | None = None,
    new_values: dict[str, Any] | None = None,
) -> None:
    cur.execute(
        """
        INSERT INTO audit_logs (actor_user_id, actor_email, actor_role, action,
                                table_name, record_id, old_values, new_values)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            actor.user_id,
            actor.email,
            actor.role,
            action,
            table_name,
            record_id,
            Jsonb(old_values) if old_values is not None else None,
            Jsonb(new_values) if new_values is not None else None,
        ),
    )


def summarise(values: dict[str, Any] | None) -> str:
    """Short human-readable form of a change set, for list views."""
    if not values:
        return ""
    return ", ".join(f"{k}={json.dumps(v, default=str)}" for k, v in values.items())
