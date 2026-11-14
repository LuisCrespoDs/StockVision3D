from typing import Generator
from psycopg_pool import ConnectionPool
from psycopg.rows import dict_row
from .config import DATABASE_URL

_pool: ConnectionPool | None = None

def open_pool() -> None:
    global _pool
    if not DATABASE_URL:
        raise RuntimeError("Falta DATABASE_URL. Copia backend/.env.example a backend/.env y configura Supabase.")
    if _pool is None:
        _pool = ConnectionPool(
            conninfo=DATABASE_URL,
            min_size=1,
            max_size=8,
            kwargs={"row_factory": dict_row, "prepare_threshold": None},
            open=False,
        )
        _pool.open(wait=True, timeout=20)

def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None

def get_db() -> Generator:
    if _pool is None:
        raise RuntimeError("El pool PostgreSQL no está inicializado.")
    with _pool.connection() as conn:
        yield conn
