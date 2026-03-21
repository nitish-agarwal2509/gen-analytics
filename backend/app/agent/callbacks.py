"""ADK callbacks for audit logging."""

import logging

from app.db.database import async_session
from app.db.models import AuditLog

logger = logging.getLogger(__name__)


async def audit_after_tool(*, tool, args, tool_context, tool_response) -> dict | None:
    """Log execute_sql calls to the audit_log table.

    ADK calls after_tool_callback with keyword args:
        tool, args, tool_context, tool_response
    """
    if tool.name != "execute_sql":
        return None

    try:
        ctx = tool_context
        user_id = ctx.user_id or "unknown"
        session_id = ctx.session.id if ctx.session else None

        # Extract the user's question from conversation history
        question = ""
        if ctx.session and ctx.session.events:
            for event in reversed(ctx.session.events):
                if event.content and event.content.role == "user":
                    for part in event.content.parts:
                        if hasattr(part, "text") and part.text:
                            question = part.text
                            break
                    if question:
                        break

        # tool_response is a dict with the tool result
        result = tool_response if isinstance(tool_response, dict) else {}
        bytes_processed = result.get("bytes_processed")

        entry = AuditLog(
            user_id=user_id,
            session_id=session_id,
            question=question,
            generated_sql=args.get("sql", ""),
            bytes_scanned=bytes_processed,
            cost_usd=bytes_processed * 6.25 / 1e12 if bytes_processed else None,
            success="error" not in result,
            error_message=result.get("error"),
        )

        async with async_session() as db:
            db.add(entry)
            await db.commit()

    except Exception:
        logger.exception("Failed to write audit log")

    return None
