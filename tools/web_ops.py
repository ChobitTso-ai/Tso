"""Web operation tools — HTTP GET/POST, JSON fetch."""
import json
from typing import Any

import httpx

from mcp_server.protocol import ToolDefinition, ToolResult

_CLIENT_TIMEOUT = 30.0


def _http_get(url: str, headers: dict | None = None, params: dict | None = None) -> ToolResult:
    try:
        r = httpx.get(url, headers=headers or {}, params=params or {}, timeout=_CLIENT_TIMEOUT, follow_redirects=True)
        return ToolResult(content=r.text, metadata={"status_code": r.status_code, "content_type": r.headers.get("content-type", "")})
    except Exception as e:
        return ToolResult(error=str(e))


def _http_post(url: str, body: dict | None = None, headers: dict | None = None) -> ToolResult:
    try:
        r = httpx.post(url, json=body or {}, headers=headers or {}, timeout=_CLIENT_TIMEOUT, follow_redirects=True)
        return ToolResult(content=r.text, metadata={"status_code": r.status_code})
    except Exception as e:
        return ToolResult(error=str(e))


def _fetch_json(url: str, headers: dict | None = None) -> ToolResult:
    try:
        r = httpx.get(url, headers=headers or {}, timeout=_CLIENT_TIMEOUT, follow_redirects=True)
        r.raise_for_status()
        data = r.json()
        return ToolResult(content=json.dumps(data, ensure_ascii=False, indent=2))
    except Exception as e:
        return ToolResult(error=str(e))


def _call_api(
    method: str,
    url: str,
    headers: dict | None = None,
    body: dict | None = None,
    params: dict | None = None,
) -> ToolResult:
    """Generic HTTP call — wraps GET/POST/PUT/DELETE in one intent-based tool."""
    try:
        r = httpx.request(
            method.upper(),
            url,
            headers=headers or {},
            json=body,
            params=params or {},
            timeout=_CLIENT_TIMEOUT,
            follow_redirects=True,
        )
        try:
            content = json.dumps(r.json(), ensure_ascii=False, indent=2)
        except Exception:
            content = r.text
        return ToolResult(content=content, metadata={"status_code": r.status_code})
    except Exception as e:
        return ToolResult(error=str(e))


TOOL_HANDLERS: dict[str, Any] = {
    "http_get": _http_get,
    "http_post": _http_post,
    "fetch_json": _fetch_json,
    "call_api": _call_api,
}

WEB_TOOLS: list[ToolDefinition] = [
    ToolDefinition(
        name="http_get",
        description="Send an HTTP GET request and return the response body.",
        category="web",
        input_schema={
            "type": "object",
            "properties": {
                "url": {"type": "string"},
                "headers": {"type": "object"},
                "params": {"type": "object", "description": "Query string parameters"},
            },
            "required": ["url"],
        },
        handler=_http_get,
    ),
    ToolDefinition(
        name="http_post",
        description="Send an HTTP POST request with a JSON body.",
        category="web",
        input_schema={
            "type": "object",
            "properties": {
                "url": {"type": "string"},
                "body": {"type": "object"},
                "headers": {"type": "object"},
            },
            "required": ["url"],
        },
        handler=_http_post,
    ),
    ToolDefinition(
        name="fetch_json",
        description="Fetch a URL and parse the response as JSON, returning pretty-printed output.",
        category="web",
        input_schema={
            "type": "object",
            "properties": {
                "url": {"type": "string"},
                "headers": {"type": "object"},
            },
            "required": ["url"],
        },
        handler=_fetch_json,
    ),
    ToolDefinition(
        name="call_api",
        description=(
            "Generic intent-based API call. Supports any HTTP method. "
            "Use this when you need to interact with a REST API endpoint."
        ),
        category="web",
        input_schema={
            "type": "object",
            "properties": {
                "method": {"type": "string", "enum": ["GET", "POST", "PUT", "PATCH", "DELETE"]},
                "url": {"type": "string"},
                "headers": {"type": "object"},
                "body": {"type": "object"},
                "params": {"type": "object"},
            },
            "required": ["method", "url"],
        },
        handler=_call_api,
    ),
]
