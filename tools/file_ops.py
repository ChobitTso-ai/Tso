"""File operation tools — read, write, search files."""
import os
import glob
from pathlib import Path
from typing import Any

from mcp_server.protocol import ToolDefinition, ToolResult


def _read_file(path: str, encoding: str = "utf-8") -> ToolResult:
    try:
        content = Path(path).read_text(encoding=encoding)
        return ToolResult(content=content)
    except FileNotFoundError:
        return ToolResult(error=f"File not found: {path}")
    except Exception as e:
        return ToolResult(error=str(e))


def _write_file(path: str, content: str, encoding: str = "utf-8") -> ToolResult:
    try:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding=encoding)
        return ToolResult(content=f"Written {len(content)} bytes to {path}")
    except Exception as e:
        return ToolResult(error=str(e))


def _search_files(directory: str, pattern: str, max_results: int = 50) -> ToolResult:
    try:
        matches = glob.glob(os.path.join(directory, "**", pattern), recursive=True)
        lines = matches[:max_results]
        if len(matches) > max_results:
            lines.append(f"... and {len(matches) - max_results} more")
        return ToolResult(content="\n".join(lines) if lines else "No files found")
    except Exception as e:
        return ToolResult(error=str(e))


def _list_directory(path: str) -> ToolResult:
    try:
        entries = sorted(os.listdir(path))
        items = []
        for e in entries:
            full = os.path.join(path, e)
            tag = "dir" if os.path.isdir(full) else "file"
            items.append(f"[{tag}] {e}")
        return ToolResult(content="\n".join(items) if items else "(empty)")
    except Exception as e:
        return ToolResult(error=str(e))


def _append_file(path: str, content: str) -> ToolResult:
    try:
        with open(path, "a", encoding="utf-8") as f:
            f.write(content)
        return ToolResult(content=f"Appended {len(content)} bytes to {path}")
    except Exception as e:
        return ToolResult(error=str(e))


TOOL_HANDLERS: dict[str, Any] = {
    "read_file": _read_file,
    "write_file": _write_file,
    "search_files": _search_files,
    "list_directory": _list_directory,
    "append_file": _append_file,
}

FILE_TOOLS: list[ToolDefinition] = [
    ToolDefinition(
        name="read_file",
        description="Read the full contents of a file from disk.",
        category="file",
        input_schema={
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Absolute or relative file path"},
                "encoding": {"type": "string", "default": "utf-8"},
            },
            "required": ["path"],
        },
        handler=_read_file,
    ),
    ToolDefinition(
        name="write_file",
        description="Write (overwrite) content to a file, creating parent directories as needed.",
        category="file",
        input_schema={
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "content": {"type": "string"},
                "encoding": {"type": "string", "default": "utf-8"},
            },
            "required": ["path", "content"],
        },
        handler=_write_file,
    ),
    ToolDefinition(
        name="search_files",
        description="Glob-search files in a directory tree by filename pattern.",
        category="file",
        input_schema={
            "type": "object",
            "properties": {
                "directory": {"type": "string"},
                "pattern": {"type": "string", "description": "Glob pattern, e.g. '*.py'"},
                "max_results": {"type": "integer", "default": 50},
            },
            "required": ["directory", "pattern"],
        },
        handler=_search_files,
    ),
    ToolDefinition(
        name="list_directory",
        description="List files and subdirectories inside a directory.",
        category="file",
        input_schema={
            "type": "object",
            "properties": {"path": {"type": "string"}},
            "required": ["path"],
        },
        handler=_list_directory,
    ),
    ToolDefinition(
        name="append_file",
        description="Append text to the end of an existing file.",
        category="file",
        input_schema={
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "content": {"type": "string"},
            },
            "required": ["path", "content"],
        },
        handler=_append_file,
    ),
]
