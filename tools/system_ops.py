"""System operation tools — run shell commands, env vars, process info."""
import os
import subprocess
import shlex
from typing import Any

from mcp_server.protocol import ToolDefinition, ToolResult

_DEFAULT_TIMEOUT = 30


def _run_command(command: str, cwd: str | None = None, timeout: int = _DEFAULT_TIMEOUT) -> ToolResult:
    try:
        result = subprocess.run(
            shlex.split(command),
            capture_output=True,
            text=True,
            cwd=cwd,
            timeout=timeout,
        )
        output = result.stdout
        if result.stderr:
            output += f"\n[stderr]\n{result.stderr}"
        return ToolResult(
            content=output or "(no output)",
            metadata={"exit_code": result.returncode},
        )
    except subprocess.TimeoutExpired:
        return ToolResult(error=f"Command timed out after {timeout}s")
    except Exception as e:
        return ToolResult(error=str(e))


def _get_env(key: str, default: str = "") -> ToolResult:
    value = os.environ.get(key, default)
    if value:
        return ToolResult(content=value)
    return ToolResult(error=f"Environment variable '{key}' not set")


def _list_env(prefix: str = "") -> ToolResult:
    items = {k: v for k, v in os.environ.items() if k.startswith(prefix)}
    lines = [f"{k}={v}" for k, v in sorted(items.items())]
    return ToolResult(content="\n".join(lines) if lines else "(no matching variables)")


def _check_service(host: str, port: int) -> ToolResult:
    import socket
    try:
        sock = socket.create_connection((host, port), timeout=5)
        sock.close()
        return ToolResult(content=f"{host}:{port} is reachable")
    except Exception as e:
        return ToolResult(error=f"{host}:{port} unreachable — {e}")


TOOL_HANDLERS: dict[str, Any] = {
    "run_command": _run_command,
    "get_env": _get_env,
    "list_env": _list_env,
    "check_service": _check_service,
}

SYSTEM_TOOLS: list[ToolDefinition] = [
    ToolDefinition(
        name="run_command",
        description=(
            "Run a shell command and return stdout/stderr. "
            "Suitable for local or container environments with shell access."
        ),
        category="system",
        input_schema={
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "Shell command to run"},
                "cwd": {"type": "string", "description": "Working directory"},
                "timeout": {"type": "integer", "default": 30},
            },
            "required": ["command"],
        },
        handler=_run_command,
    ),
    ToolDefinition(
        name="get_env",
        description="Read a single environment variable by name.",
        category="system",
        input_schema={
            "type": "object",
            "properties": {
                "key": {"type": "string"},
                "default": {"type": "string", "default": ""},
            },
            "required": ["key"],
        },
        handler=_get_env,
    ),
    ToolDefinition(
        name="list_env",
        description="List all environment variables, optionally filtered by prefix.",
        category="system",
        input_schema={
            "type": "object",
            "properties": {
                "prefix": {"type": "string", "default": "", "description": "Filter by prefix, e.g. 'AWS_'"},
            },
        },
        handler=_list_env,
    ),
    ToolDefinition(
        name="check_service",
        description="TCP-connect to host:port to verify a service is reachable.",
        category="system",
        input_schema={
            "type": "object",
            "properties": {
                "host": {"type": "string"},
                "port": {"type": "integer"},
            },
            "required": ["host", "port"],
        },
        handler=_check_service,
    ),
]
