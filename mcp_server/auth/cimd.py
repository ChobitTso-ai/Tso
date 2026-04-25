"""CIMD — Client ID Metadata Documents.

Implements the MCP OAuth client registration metadata endpoint so that
clients (Claude.ai, Claude Code) can discover OAuth parameters without
manual setup, reducing re-authorization friction.

Endpoint: GET /.well-known/client-metadata.json
"""
from __future__ import annotations

import config


def build_client_metadata(base_url: str | None = None) -> dict:
    """Return the CIMD JSON document for this MCP server."""
    base = (base_url or config.MCP_BASE_URL).rstrip("/")
    return {
        "client_id": config.OAUTH_CLIENT_ID,
        "client_name": config.OAUTH_CLIENT_NAME,
        "client_uri": base,
        # Redirect URIs used during OAuth authorization code flow
        "redirect_uris": [
            f"{base}/oauth/callback",
        ],
        # Token endpoint auth method — using none (PKCE) for SPA/CLI clients
        "token_endpoint_auth_method": "none",
        # Supported grant types
        "grant_types": ["authorization_code", "refresh_token"],
        "response_types": ["code"],
        # Scopes this client may request
        "scope": "mcp:tools mcp:resources openid profile email",
        # Logo / contact (optional but improves UX in consent screens)
        "logo_uri": f"{base}/static/logo.png",
        "contacts": ["dev@example.com"],
        # MCP-specific: advertise elicitation + tool search capabilities
        "mcp_capabilities": {
            "elicitation": True,
            "tool_search": True,
            "vaults": True,
        },
    }
