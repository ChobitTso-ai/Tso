"""Remote MCP Server — FastAPI implementation of MCP over HTTP (JSON-RPC 2.0).

Endpoints:
  POST /mcp          — JSON-RPC 2.0 (tools/list, tools/call, tools/search, initialize)
  GET  /mcp/sse      — SSE stream for server-initiated messages
  GET  /.well-known/client-metadata.json  — CIMD (OAuth metadata)
  GET  /health       — Health check

Run with:
  uvicorn mcp_server.server:app --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import asyncio
import json
import sys
import os

# Ensure project root is on path when running as module
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse

from mcp_server.protocol import (
    JsonRpcRequest,
    ToolResult,
    SERVER_INFO,
    SERVER_CAPABILITIES,
    ok_response,
    err_response,
)
from mcp_server.registry import ToolRegistry
from mcp_server.auth.cimd import build_client_metadata
from mcp_server.auth.vaults import Vaults
from mcp_server.elicitation import ElicitationRequired
from tools import ALL_TOOLS

app = FastAPI(title="Agent MCP Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Singletons
# ---------------------------------------------------------------------------

registry = ToolRegistry()
registry.register_many(ALL_TOOLS)

vaults = Vaults()

# ---------------------------------------------------------------------------
# Health + CIMD
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "tools": len(registry.all_tools())}


@app.get("/.well-known/client-metadata.json")
async def cimd(request: Request):
    base_url = str(request.base_url).rstrip("/")
    return JSONResponse(build_client_metadata(base_url))


# ---------------------------------------------------------------------------
# SSE stream (server → client push)
# ---------------------------------------------------------------------------

_sse_queues: list[asyncio.Queue] = []


@app.get("/mcp/sse")
async def mcp_sse(request: Request):
    queue: asyncio.Queue = asyncio.Queue()
    _sse_queues.append(queue)

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    msg = queue.get_nowait()
                    yield {"data": json.dumps(msg)}
                except asyncio.QueueEmpty:
                    await asyncio.sleep(0.1)
        finally:
            _sse_queues.remove(queue)

    return EventSourceResponse(event_generator())


async def _broadcast(event: dict) -> None:
    for q in list(_sse_queues):
        await q.put(event)


# ---------------------------------------------------------------------------
# Main MCP endpoint — JSON-RPC 2.0
# ---------------------------------------------------------------------------

@app.post("/mcp")
async def mcp_endpoint(request: Request):
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(err_response(None, -32700, "Parse error"), status_code=400)

    try:
        rpc = JsonRpcRequest.from_dict(body)
    except (KeyError, TypeError) as e:
        return JSONResponse(err_response(None, -32600, f"Invalid request: {e}"), status_code=400)

    vault_id = request.headers.get("X-Vault-Id")

    handler = _HANDLERS.get(rpc.method)
    if handler is None:
        return JSONResponse(err_response(rpc.id, -32601, f"Method not found: {rpc.method}"))

    result = await handler(rpc, vault_id)
    return JSONResponse(result)


# ---------------------------------------------------------------------------
# Method handlers
# ---------------------------------------------------------------------------

async def _handle_initialize(rpc: JsonRpcRequest, _vault_id: str | None) -> dict:
    return ok_response(rpc.id, {
        "protocolVersion": "2025-03-26",
        "serverInfo": SERVER_INFO,
        "capabilities": SERVER_CAPABILITIES,
    })


async def _handle_tools_list(rpc: JsonRpcRequest, _vault_id: str | None) -> dict:
    tools = registry.all_tools()
    return ok_response(rpc.id, {"tools": [t.to_mcp() for t in tools]})


async def _handle_tools_search(rpc: JsonRpcRequest, _vault_id: str | None) -> dict:
    """Non-standard extension: search tools by keyword to reduce context tokens."""
    query = rpc.params.get("query", "")
    top_k = int(rpc.params.get("top_k", 10))
    tools = registry.search(query, top_k=top_k)
    return ok_response(rpc.id, {
        "tools": [t.to_mcp() for t in tools],
        "total_tools": len(registry.all_tools()),
        "returned": len(tools),
    })


async def _handle_tools_call(rpc: JsonRpcRequest, vault_id: str | None) -> dict:
    name = rpc.params.get("name")
    arguments = rpc.params.get("arguments", {})

    if not name:
        return err_response(rpc.id, -32602, "Missing 'name' in params")

    # Inject vault credentials if caller supplied a vault_id header
    if vault_id:
        injected = vaults.inject(vault_id, {})
        if injected.get("Authorization") and "headers" in arguments:
            arguments["headers"] = {**arguments.get("headers", {}), **injected}

    try:
        result: ToolResult = registry.call(name, arguments)
    except ElicitationRequired as elicit:
        return ok_response(rpc.id, {"content": [elicit.to_mcp()], "isError": False})
    except Exception as e:
        return err_response(rpc.id, -32603, str(e))

    await _broadcast({"event": "tool_called", "tool": name})
    return ok_response(rpc.id, {"content": [result.to_mcp()], "isError": not result.ok})


# ---------------------------------------------------------------------------
# Vault management endpoints (REST, not JSON-RPC)
# ---------------------------------------------------------------------------

@app.post("/vaults/{vault_id}")
async def vault_store(vault_id: str, request: Request):
    body = await request.json()
    vaults.store(vault_id, body)
    return {"vault_id": vault_id, "stored": True}


@app.get("/vaults/{vault_id}")
async def vault_check(vault_id: str):
    creds = vaults.retrieve(vault_id)
    if creds is None:
        raise HTTPException(status_code=404, detail="Vault not found")
    # Return only non-sensitive metadata
    return {"vault_id": vault_id, "has_access_token": bool(creds.get("access_token")), "expires_at": creds.get("expires_at")}


@app.delete("/vaults/{vault_id}")
async def vault_delete(vault_id: str):
    deleted = vaults.delete(vault_id)
    return {"vault_id": vault_id, "deleted": deleted}


# ---------------------------------------------------------------------------
# Dispatch table
# ---------------------------------------------------------------------------

_HANDLERS = {
    "initialize": _handle_initialize,
    "tools/list": _handle_tools_list,
    "tools/search": _handle_tools_search,
    "tools/call": _handle_tools_call,
}
