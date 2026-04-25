"""MCP protocol types — JSON-RPC 2.0 over HTTP."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable


# ---------------------------------------------------------------------------
# Core data types
# ---------------------------------------------------------------------------

@dataclass
class ToolResult:
    content: str = ""
    error: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def ok(self) -> bool:
        return not self.error

    def to_mcp(self) -> dict:
        if self.error:
            return {"type": "text", "text": f"[error] {self.error}", "isError": True}
        return {"type": "text", "text": self.content}


@dataclass
class ToolDefinition:
    name: str
    description: str
    category: str
    input_schema: dict[str, Any]
    handler: Callable[..., ToolResult]
    tags: list[str] = field(default_factory=list)

    def to_mcp(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "inputSchema": self.input_schema,
        }


# ---------------------------------------------------------------------------
# JSON-RPC 2.0 envelope types
# ---------------------------------------------------------------------------

@dataclass
class JsonRpcRequest:
    jsonrpc: str
    method: str
    id: Any
    params: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, d: dict) -> "JsonRpcRequest":
        return cls(
            jsonrpc=d.get("jsonrpc", "2.0"),
            method=d["method"],
            id=d.get("id"),
            params=d.get("params", {}),
        )


def ok_response(id: Any, result: Any) -> dict:
    return {"jsonrpc": "2.0", "id": id, "result": result}


def err_response(id: Any, code: int, message: str) -> dict:
    return {"jsonrpc": "2.0", "id": id, "error": {"code": code, "message": message}}


# ---------------------------------------------------------------------------
# MCP capability constants
# ---------------------------------------------------------------------------

SERVER_INFO = {
    "name": "agent-mcp-server",
    "version": "1.0.0",
}

SERVER_CAPABILITIES = {
    "tools": {"listChanged": True},
    "elicitation": {},
}
