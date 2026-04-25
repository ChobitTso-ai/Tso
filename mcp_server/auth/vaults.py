"""Vaults — encrypted credential storage for MCP connections.

Mirrors the Anthropic Managed Agents credential mechanism:
- Register an OAuth token once (store in Vault).
- Specify vault_id when creating a session.
- The server injects the correct credential into each MCP call automatically.
- Token refresh is handled transparently.

Storage: SQLite + Fernet symmetric encryption.
"""
from __future__ import annotations

import base64
import json
import sqlite3
import time
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken

import config


def _make_fernet() -> Fernet:
    raw = config.VAULT_ENCRYPTION_KEY
    # Ensure it is valid 32-byte URL-safe base64
    key = base64.urlsafe_b64encode(base64.urlsafe_b64decode(raw.encode())[:32].ljust(32, b"="))
    return Fernet(key)


class Vaults:
    """Thread-safe SQLite-backed credential vault."""

    def __init__(self, db_path: str | None = None) -> None:
        self._path = db_path or config.VAULT_DB_PATH
        self._fernet = _make_fernet()
        self._init_db()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def store(self, vault_id: str, credentials: dict) -> str:
        """Encrypt and persist *credentials* under *vault_id*. Returns vault_id."""
        blob = self._fernet.encrypt(json.dumps(credentials).encode())
        with self._conn() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO vaults (vault_id, blob, updated_at) VALUES (?, ?, ?)",
                (vault_id, blob, int(time.time())),
            )
        return vault_id

    def retrieve(self, vault_id: str) -> dict | None:
        """Decrypt and return credentials for *vault_id*, or None if not found."""
        with self._conn() as conn:
            row = conn.execute(
                "SELECT blob FROM vaults WHERE vault_id = ?", (vault_id,)
            ).fetchone()
        if not row:
            return None
        try:
            return json.loads(self._fernet.decrypt(row[0]))
        except InvalidToken:
            return None

    def delete(self, vault_id: str) -> bool:
        """Remove a vault entry. Returns True if it existed."""
        with self._conn() as conn:
            cur = conn.execute("DELETE FROM vaults WHERE vault_id = ?", (vault_id,))
        return cur.rowcount > 0

    def refresh_token(self, vault_id: str, new_access_token: str, expires_at: int) -> bool:
        """Update only the access_token + expiry, keeping other credentials intact."""
        creds = self.retrieve(vault_id)
        if creds is None:
            return False
        creds["access_token"] = new_access_token
        creds["expires_at"] = expires_at
        self.store(vault_id, creds)
        return True

    def inject(self, vault_id: str, headers: dict) -> dict:
        """Inject stored Bearer token into *headers* dict. Returns updated headers."""
        creds = self.retrieve(vault_id)
        if creds and creds.get("access_token"):
            headers = dict(headers)
            headers["Authorization"] = f"Bearer {creds['access_token']}"
        return headers

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _init_db(self) -> None:
        Path(self._path).parent.mkdir(parents=True, exist_ok=True)
        with self._conn() as conn:
            conn.execute(
                """CREATE TABLE IF NOT EXISTS vaults (
                    vault_id  TEXT PRIMARY KEY,
                    blob      BLOB NOT NULL,
                    updated_at INTEGER NOT NULL
                )"""
            )

    def _conn(self) -> sqlite3.Connection:
        return sqlite3.connect(self._path)
