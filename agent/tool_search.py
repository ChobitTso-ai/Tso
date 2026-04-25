"""Tool search client — fetches only relevant tools from an MCP server.

Instead of loading all tool definitions into context (expensive), this module
queries the server's tools/search endpoint and returns only the tools relevant
to the current task. Anthropic benchmarks show this cuts tool-definition tokens
by 85%+ while maintaining selection accuracy.
"""
from __future__ import annotations

import json

import httpx

import config


class MCPToolSearchClient:
    """Thin client that wraps the MCP tools/search endpoint."""

    def __init__(self, server_url: str | None = None) -> None:
        self._base = (server_url or config.MCP_BASE_URL).rstrip("/")
        self._session_headers: dict[str, str] = {}

    def set_vault(self, vault_id: str) -> None:
        self._session_headers["X-Vault-Id"] = vault_id

    # ------------------------------------------------------------------
    # Tool discovery
    # ------------------------------------------------------------------

    def search(self, query: str, top_k: int = 8) -> list[dict]:
        """Return up to *top_k* tool schemas relevant to *query*.

        Each item is a dict with keys: name, description, inputSchema
        (ready to pass directly to Claude as a tool definition).
        """
        payload = self._rpc("tools/search", {"query": query, "top_k": top_k})
        return payload.get("result", {}).get("tools", [])

    def list_all(self) -> list[dict]:
        payload = self._rpc("tools/list", {})
        return payload.get("result", {}).get("tools", [])

    # ------------------------------------------------------------------
    # Tool execution
    # ------------------------------------------------------------------

    def call(self, name: str, arguments: dict) -> str:
        """Call a tool on the MCP server and return text content."""
        payload = self._rpc(
            "tools/call",
            {"name": name, "arguments": arguments},
        )
        result = payload.get("result", {})
        content_blocks = result.get("content", [])
        parts = [block.get("text", "") for block in content_blocks]
        return "\n".join(parts)

    # ------------------------------------------------------------------
    # MCP handshake
    # ------------------------------------------------------------------

    def initialize(self) -> dict:
        return self._rpc("initialize", {}).get("result", {})

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _rpc(self, method: str, params: dict, rpc_id: int = 1) -> dict:
        body = {"jsonrpc": "2.0", "id": rpc_id, "method": method, "params": params}
        try:
            r = httpx.post(
                f"{self._base}/mcp",
                json=body,
                headers={"Content-Type": "application/json", **self._session_headers},
                timeout=30.0,
            )
            r.raise_for_status()
            return r.json()
        except Exception as e:
            return {"error": str(e)}
