"""Agent core — Claude-powered agent that uses MCP tool search + sandbox.

Key design decisions from the slides:
  1. Tool search: only load tools relevant to the current task (85% token savings).
  2. Programmatic tool calling: process results in sandbox before sending to Claude (37% savings).
  3. Vault injection: credentials are injected automatically per MCP call.
  4. Elicitation: pause and surface form/URL prompts to the user when needed.
"""
from __future__ import annotations

import json
import sys
import os
from typing import Iterator

import anthropic

import config
from agent.tool_search import MCPToolSearchClient
from agent.sandbox import run as sandbox_run, SandboxResult

# Elicitation marker in tool result text
_ELICITATION_PREFIX = '{"type": "elicitation"'


class Agent:
    """Agentic loop: think → tool_search → call tool → sandbox → respond."""

    def __init__(
        self,
        mcp_url: str | None = None,
        vault_id: str | None = None,
        model: str | None = None,
        max_tokens: int | None = None,
        system_prompt: str = (
            "You are a capable AI agent. You have access to tools via MCP. "
            "Think step by step. Use tools when needed. Be concise."
        ),
    ) -> None:
        self._client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
        self._model = model or config.MODEL
        self._max_tokens = max_tokens or config.MAX_TOKENS
        self._system = system_prompt
        self._mcp = MCPToolSearchClient(mcp_url)
        if vault_id:
            self._mcp.set_vault(vault_id)
        self._tool_cache: dict[str, list[dict]] = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run(self, user_message: str, verbose: bool = False) -> str:
        """Run the agentic loop for *user_message* and return the final answer."""
        messages: list[dict] = [{"role": "user", "content": user_message}]

        # Fetch only the tools relevant to the user's request (85% token savings)
        tools = self._search_tools(user_message)

        if verbose:
            print(f"[agent] loaded {len(tools)} tools for this task", file=sys.stderr)

        while True:
            response = self._client.messages.create(
                model=self._model,
                max_tokens=self._max_tokens,
                system=self._system,
                tools=tools,
                messages=messages,
            )

            # Collect assistant message
            assistant_content = response.content
            messages.append({"role": "assistant", "content": assistant_content})

            if response.stop_reason == "end_turn":
                # Extract final text
                for block in assistant_content:
                    if hasattr(block, "text"):
                        return block.text
                return ""

            if response.stop_reason != "tool_use":
                break

            # Process tool calls
            tool_results = []
            for block in assistant_content:
                if block.type != "tool_use":
                    continue

                tool_result_text = self._invoke_tool(block.name, block.input, verbose=verbose)

                # Elicitation: surface to user and exit loop
                if tool_result_text.startswith(_ELICITATION_PREFIX):
                    return self._handle_elicitation(tool_result_text)

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": tool_result_text,
                })

            messages.append({"role": "user", "content": tool_results})

            # Refresh tool list based on latest context (adaptive tool search)
            last_assistant_text = " ".join(
                b.text for b in assistant_content if hasattr(b, "text")
            )
            if last_assistant_text:
                refreshed = self._search_tools(last_assistant_text)
                if refreshed:
                    tools = refreshed

        return "[agent stopped unexpectedly]"

    def stream(self, user_message: str) -> Iterator[str]:
        """Stream the final answer token by token (simple wrapper)."""
        answer = self.run(user_message)
        yield answer

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _search_tools(self, query: str) -> list[dict]:
        """Query MCP server for relevant tools. Cache by query string."""
        cache_key = query[:120]
        if cache_key in self._tool_cache:
            return self._tool_cache[cache_key]
        try:
            raw_tools = self._mcp.search(query, top_k=8)
            # Convert MCP schema to Anthropic tool format
            tools = [
                {
                    "name": t["name"],
                    "description": t["description"],
                    "input_schema": t.get("inputSchema", {"type": "object", "properties": {}}),
                }
                for t in raw_tools
            ]
            self._tool_cache[cache_key] = tools
            return tools
        except Exception:
            return []

    def _invoke_tool(self, name: str, arguments: dict, verbose: bool = False) -> str:
        """Call tool via MCP, then optionally process through sandbox."""
        if verbose:
            print(f"[agent] calling tool: {name}({json.dumps(arguments)[:80]})", file=sys.stderr)

        raw = self._mcp.call(name, arguments)

        # Programmatic tool calling: apply sandbox processing for large results
        processed = self._sandbox_process(name, raw)
        if verbose and processed != raw:
            orig_len, new_len = len(raw), len(processed)
            pct = int((1 - new_len / max(orig_len, 1)) * 100)
            print(f"[agent] sandbox reduced result by {pct}%", file=sys.stderr)

        return processed

    def _sandbox_process(self, tool_name: str, raw: str) -> str:
        """Apply lightweight sandbox post-processing for known tool result shapes."""
        # Only process large JSON payloads to avoid unnecessary overhead
        if len(raw) < 500:
            return raw
        try:
            data = json.loads(raw)
        except Exception:
            return raw

        # Generic: if it's a list, truncate to first 50 items to keep context tight
        if isinstance(data, list) and len(data) > 50:
            script = "result = items[:50]"
            out: SandboxResult = sandbox_run(script, {"items": data})
            if out.ok:
                return out.to_text()

        return raw

    @staticmethod
    def _handle_elicitation(elicitation_json: str) -> str:
        try:
            payload = json.loads(elicitation_json)
        except Exception:
            return elicitation_json

        mode = payload.get("mode", "form")
        title = payload.get("title", "Input required")
        message = payload.get("message", "")

        lines = [f"\n[Elicitation required] {title}"]
        if message:
            lines.append(message)
        if mode == "form":
            schema = payload.get("schema", {})
            lines.append(f"Please provide: {json.dumps(schema, indent=2)}")
        else:
            lines.append(f"Please visit: {payload.get('url', '')}")
        lines.append("Re-run after completing the required action.")
        return "\n".join(lines)
