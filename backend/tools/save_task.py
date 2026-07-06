"""
The save_task tool's actual side effect: inserting a row into `tasks`,
scoped to the workspace. This is the "at least one tool causes a real side
effect recorded in the active workspace" requirement from the brief.
"""

from uuid import UUID

from db.client import get_connection
from tools.schemas import SaveTaskArgs


def run_save_task(workspace_id: UUID, args: SaveTaskArgs) -> dict:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "insert into tasks (workspace_id, title, description) "
                "values (%s, %s, %s) returning id, title, description, created_at",
                (str(workspace_id), args.title, args.description),
            )
            row = cur.fetchone()
        conn.commit()

    return {
        "task_id": str(row["id"]),
        "title": row["title"],
        "description": row["description"],
        "created_at": row["created_at"].isoformat(),
    }
