import os
from pathlib import Path

BASE_DIR = Path(__file__).parent

ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
MODEL: str = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")
MAX_TOKENS: int = int(os.getenv("MAX_TOKENS", "4096"))

MCP_HOST: str = os.getenv("MCP_HOST", "0.0.0.0")
MCP_PORT: int = int(os.getenv("MCP_PORT", "8000"))
MCP_BASE_URL: str = os.getenv("MCP_BASE_URL", f"http://localhost:{MCP_PORT}")

VAULT_DB_PATH: str = os.getenv("VAULT_DB_PATH", str(BASE_DIR / "vaults.db"))

# Derived from cryptography.fernet; set a real 32-byte URL-safe base64 key in prod
VAULT_ENCRYPTION_KEY: str = os.getenv(
    "VAULT_ENCRYPTION_KEY",
    "dGhpcmlzYXRlc3Rfa2V5Zm9yZGV2X29ubHlfXzMyYg==",
)

OAUTH_CLIENT_ID: str = os.getenv("OAUTH_CLIENT_ID", "agent-mcp-client")
OAUTH_CLIENT_NAME: str = os.getenv("OAUTH_CLIENT_NAME", "Agent MCP Client")
