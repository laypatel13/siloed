import psycopg
from psycopg.rows import dict_row

from config import settings


def get_connection():
    """Returns a new psycopg connection using DATABASE_URL.
    Caller is responsible for closing it (use as a context manager).
    """
    return psycopg.connect(settings.database_url, row_factory=dict_row)
