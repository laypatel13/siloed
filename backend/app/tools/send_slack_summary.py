"""
The send_slack_summary tool's actual side effect: posting a message to the
workspace's Slack channel via an incoming webhook. This is the second tool
required by the brief -- an external-side-effect call, as opposed to
save_task's DB-only write.

Config note: `SLACK_WEBHOOK_URL` is a single shared webhook read from env
(config.py), not a per-workspace value -- there's no per-workspace webhook
storage in this build. Documented as a known simplification in AI_NOTES.md.
If it's unset, the tool fails gracefully (caught by executor.py's try/except
around the handler call) rather than crashing the request.
"""

from uuid import UUID

import httpx

from app.core.config import settings
from app.tools.schemas import SendSlackSummaryArgs


def run_send_slack_summary(workspace_id: UUID, args: SendSlackSummaryArgs) -> dict:
    if not settings.slack_webhook_url:
        raise RuntimeError("SLACK_WEBHOOK_URL is not configured")

    response = httpx.post(
        settings.slack_webhook_url,
        json={"text": args.summary},
        timeout=10.0,
    )
    response.raise_for_status()

    return {
        "posted": True,
        "summary": args.summary,
    }
