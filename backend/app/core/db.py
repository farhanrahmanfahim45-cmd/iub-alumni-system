"""
PostgreSQL access.

A single connection pool for the process. Every database call in the
application goes through here — the frontend never connects to PostgreSQL
(docs/security.md §3).
"""

import logging
from contextlib import contextmanager
from typing import Any, Iterator

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_pool: ConnectionPool | None = None


def init_pool() -> None:
    global _pool
    if _pool is None:
        settings = get_settings()
        _pool = ConnectionPool(
            conninfo=settings.conninfo,
            min_size=1,
            max_size=10,
            open=True,
            kwargs={"row_factory": dict_row},
        )
        logger.info("Database pool opened for %s", settings.DB_NAME)


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


@contextmanager
def get_cursor() -> Iterator[Any]:
    """A cursor on a pooled connection. Commits on clean exit, rolls back on error."""
    if _pool is None:
        init_pool()
    assert _pool is not None
    with _pool.connection() as conn:
        with conn.cursor() as cur:
            yield cur


def fetch_all(sql: str, params: tuple | dict = ()) -> list[dict]:
    with get_cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def fetch_one(sql: str, params: tuple | dict = ()) -> dict | None:
    with get_cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchone()


def execute(sql: str, params: tuple | dict = ()) -> int:
    with get_cursor() as cur:
        cur.execute(sql, params)
        return cur.rowcount
