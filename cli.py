#!/usr/bin/env python3
"""CLI interface for the Agent + MCP Server.

Commands:
  serve          Start the MCP server
  ask            Ask the agent a one-shot question
  chat           Interactive REPL with the agent
  tools list     List all registered tools
  tools search   Search tools by keyword
  vault store    Store credentials in the vault
  vault info     Show vault metadata

Usage:
  python cli.py serve
  python cli.py ask "List all Python files in /tmp"
  python cli.py chat
  python cli.py tools list
  python cli.py tools search "file read"
  python cli.py vault store my-vault --token sk-...
"""
from __future__ import annotations

import json
import os
import sys

import click

# Ensure project root on path
sys.path.insert(0, os.path.dirname(__file__))


# ---------------------------------------------------------------------------
# Root group
# ---------------------------------------------------------------------------

@click.group()
def cli():
    """Agent + MCP Server CLI."""


# ---------------------------------------------------------------------------
# serve
# ---------------------------------------------------------------------------

@cli.command()
@click.option("--host", default=None, help="Bind host (overrides MCP_HOST env)")
@click.option("--port", default=None, type=int, help="Bind port (overrides MCP_PORT env)")
@click.option("--reload", is_flag=True, help="Enable auto-reload for development")
def serve(host: str | None, port: int | None, reload: bool):
    """Start the remote MCP server."""
    import uvicorn
    import config

    h = host or config.MCP_HOST
    p = port or config.MCP_PORT
    click.echo(f"Starting MCP server on http://{h}:{p}")
    uvicorn.run("mcp_server.server:app", host=h, port=p, reload=reload)


# ---------------------------------------------------------------------------
# ask
# ---------------------------------------------------------------------------

@cli.command()
@click.argument("question")
@click.option("--mcp-url", default=None, envvar="MCP_BASE_URL", help="MCP server URL")
@click.option("--vault-id", default=None, envvar="AGENT_VAULT_ID", help="Vault ID for auth")
@click.option("--verbose", "-v", is_flag=True, help="Show tool calls")
@click.option("--no-mcp", is_flag=True, help="Use direct API tools instead of MCP")
def ask(question: str, mcp_url: str | None, vault_id: str | None, verbose: bool, no_mcp: bool):
    """Ask the agent a one-shot question and print the answer."""
    if no_mcp:
        _run_direct(question, verbose)
    else:
        _run_mcp(question, mcp_url, vault_id, verbose)


def _run_mcp(question: str, mcp_url: str | None, vault_id: str | None, verbose: bool):
    from agent.core import Agent
    try:
        agent = Agent(mcp_url=mcp_url, vault_id=vault_id)
        answer = agent.run(question, verbose=verbose)
        click.echo(answer)
    except Exception as e:
        click.secho(f"Error: {e}", fg="red", err=True)
        sys.exit(1)


def _run_direct(question: str, verbose: bool):
    """Fallback: call Claude directly using built-in tool definitions (API mode)."""
    import config
    import anthropic
    from tools import ALL_TOOLS
    from mcp_server.registry import ToolRegistry

    registry = ToolRegistry()
    registry.register_many(ALL_TOOLS)

    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
    tools = [
        {
            "name": t.name,
            "description": t.description,
            "input_schema": t.input_schema,
        }
        for t in ALL_TOOLS
    ]
    messages = [{"role": "user", "content": question}]

    while True:
        resp = client.messages.create(
            model=config.MODEL,
            max_tokens=config.MAX_TOKENS,
            tools=tools,
            messages=messages,
        )
        messages.append({"role": "assistant", "content": resp.content})

        if resp.stop_reason == "end_turn":
            for block in resp.content:
                if hasattr(block, "text"):
                    click.echo(block.text)
            return

        tool_results = []
        for block in resp.content:
            if block.type != "tool_use":
                continue
            if verbose:
                click.echo(f"  [tool] {block.name}({json.dumps(block.input)[:80]})", err=True)
            result = registry.call(block.name, block.input)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": result.content if result.ok else f"[error] {result.error}",
            })
        messages.append({"role": "user", "content": tool_results})


# ---------------------------------------------------------------------------
# chat
# ---------------------------------------------------------------------------

@cli.command()
@click.option("--mcp-url", default=None, envvar="MCP_BASE_URL")
@click.option("--vault-id", default=None, envvar="AGENT_VAULT_ID")
@click.option("--no-mcp", is_flag=True, help="Use direct API mode")
def chat(mcp_url: str | None, vault_id: str | None, no_mcp: bool):
    """Interactive REPL with the agent. Type 'exit' to quit."""
    click.echo("Agent Chat  (type 'exit' to quit)\n")
    while True:
        try:
            question = click.prompt("You", prompt_suffix="> ")
        except (EOFError, KeyboardInterrupt):
            break
        if question.strip().lower() in {"exit", "quit", "q"}:
            break
        if no_mcp:
            _run_direct(question, verbose=False)
        else:
            _run_mcp(question, mcp_url, vault_id, verbose=False)


# ---------------------------------------------------------------------------
# tools group
# ---------------------------------------------------------------------------

@cli.group()
def tools():
    """Inspect registered MCP tools."""


@tools.command("list")
@click.option("--mcp-url", default=None, envvar="MCP_BASE_URL")
def tools_list(mcp_url: str | None):
    """List all tools on the MCP server (or local registry if no URL)."""
    if mcp_url:
        from agent.tool_search import MCPToolSearchClient
        client = MCPToolSearchClient(mcp_url)
        items = client.list_all()
        for t in items:
            click.echo(f"  {t['name']:30s} {t['description'][:70]}")
        click.echo(f"\nTotal: {len(items)}")
    else:
        from tools import ALL_TOOLS
        for t in ALL_TOOLS:
            click.echo(f"  {t.name:30s} [{t.category}] {t.description[:60]}")
        click.echo(f"\nTotal: {len(ALL_TOOLS)}")


@tools.command("search")
@click.argument("query")
@click.option("--top-k", default=8, show_default=True)
@click.option("--mcp-url", default=None, envvar="MCP_BASE_URL")
def tools_search(query: str, top_k: int, mcp_url: str | None):
    """Search tools by keyword (demonstrates 85%+ token savings)."""
    from tools import ALL_TOOLS
    from mcp_server.registry import ToolRegistry

    if mcp_url:
        from agent.tool_search import MCPToolSearchClient
        client = MCPToolSearchClient(mcp_url)
        results = client.search(query, top_k=top_k)
        total = len(client.list_all())
    else:
        registry = ToolRegistry()
        registry.register_many(ALL_TOOLS)
        results = [t.to_mcp() for t in registry.search(query, top_k=top_k)]
        total = len(ALL_TOOLS)

    click.echo(f"Query: '{query}'  |  returned {len(results)} / {total} tools\n")
    for t in results:
        click.echo(f"  {t['name']:30s} {t['description'][:70]}")

    pct_saved = int((1 - len(results) / max(total, 1)) * 100)
    click.secho(f"\nContext savings: ~{pct_saved}% of tool definition tokens", fg="green")


# ---------------------------------------------------------------------------
# vault group
# ---------------------------------------------------------------------------

@cli.group()
def vault():
    """Manage credentials in the Vault."""


@vault.command("store")
@click.argument("vault_id")
@click.option("--token", required=True, help="OAuth access token")
@click.option("--expires-at", default=0, type=int, help="Unix timestamp of expiry")
@click.option("--mcp-url", default=None, envvar="MCP_BASE_URL")
def vault_store(vault_id: str, token: str, expires_at: int, mcp_url: str | None):
    """Store an OAuth token in the vault."""
    if mcp_url:
        import httpx
        r = httpx.post(
            f"{mcp_url.rstrip('/')}/vaults/{vault_id}",
            json={"access_token": token, "expires_at": expires_at},
        )
        click.echo(r.json())
    else:
        from mcp_server.auth.vaults import Vaults
        v = Vaults()
        v.store(vault_id, {"access_token": token, "expires_at": expires_at})
        click.secho(f"Stored credentials under vault_id={vault_id}", fg="green")


@vault.command("info")
@click.argument("vault_id")
@click.option("--mcp-url", default=None, envvar="MCP_BASE_URL")
def vault_info(vault_id: str, mcp_url: str | None):
    """Show metadata for a vault entry."""
    if mcp_url:
        import httpx
        r = httpx.get(f"{mcp_url.rstrip('/')}/vaults/{vault_id}")
        if r.status_code == 404:
            click.secho("Not found", fg="red")
        else:
            click.echo(json.dumps(r.json(), indent=2))
    else:
        from mcp_server.auth.vaults import Vaults
        v = Vaults()
        creds = v.retrieve(vault_id)
        if creds is None:
            click.secho("Not found", fg="red")
        else:
            click.echo(f"vault_id: {vault_id}")
            click.echo(f"has_access_token: {bool(creds.get('access_token'))}")
            click.echo(f"expires_at: {creds.get('expires_at', 'N/A')}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    cli()
