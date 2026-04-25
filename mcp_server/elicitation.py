"""Elicitation — pause a tool mid-execution to collect user input.

Two modes (matching slides 05):
  - form  : send a JSON Schema; the client renders a native form.
  - url   : redirect the user to a URL (OAuth consent, payment, etc.).

The MCP server raises ElicitationRequired; the FastAPI layer catches it and
returns the appropriate JSON-RPC response so the client can handle it.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal


@dataclass
class ElicitationRequired(Exception):
    """Raised by a tool when it needs more information from the user."""

    mode: Literal["form", "url"]
    title: str
    # form mode
    schema: dict[str, Any] = field(default_factory=dict)
    # url mode
    url: str = ""
    message: str = ""

    def to_mcp(self) -> dict:
        base: dict[str, Any] = {
            "type": "elicitation",
            "mode": self.mode,
            "title": self.title,
            "message": self.message,
        }
        if self.mode == "form":
            base["schema"] = self.schema
        else:
            base["url"] = self.url
        return base


# ---------------------------------------------------------------------------
# Helper builders — call these from inside tool handlers
# ---------------------------------------------------------------------------

def require_form(
    title: str,
    schema: dict,
    message: str = "",
) -> None:
    """Stop execution and ask the client to render a form.

    Example usage inside a tool handler::

        require_form(
            title="Confirm deletion",
            schema={
                "type": "object",
                "properties": {
                    "confirm": {"type": "boolean", "title": "I understand this is irreversible"}
                },
                "required": ["confirm"],
            },
        )
    """
    raise ElicitationRequired(mode="form", title=title, schema=schema, message=message)


def require_url(
    title: str,
    url: str,
    message: str = "Complete the action in your browser, then return here.",
) -> None:
    """Stop execution and redirect the user to *url* (OAuth, payment, etc.)."""
    raise ElicitationRequired(mode="url", title=title, url=url, message=message)
