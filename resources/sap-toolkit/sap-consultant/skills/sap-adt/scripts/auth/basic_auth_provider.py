#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Basic Authentication Provider for SAP ADT

Handles username/password authentication for on-prem SAP systems.
Maintains backward compatibility with existing code.
"""
from typing import Dict, Any
from auth.i_auth_provider import IAuthProvider
from credential_charset import encode_basic_credentials


class BasicAuthProvider(IAuthProvider):
    """
    Basic Authentication provider for SAP ADT.

    Uses HTTP Basic Auth with username and password.
    Used for on-premise SAP systems.
    """

    def __init__(self, username: str, password: str, client: str = None):
        """
        Initialize Basic Auth provider.

        Args:
            username: SAP username
            password: SAP password
            client: SAP client (mandant) - optional
        """
        self._username = username
        self._password = password
        self._client = client or '000'

    def get_auth_headers(self) -> Dict[str, str]:
        """
        Get HTTP Basic Auth headers.

        Returns:
            Dict with Authorization header (Basic base64(user:pass))
        """
        # NTT Studio uyarlamasi: kodlama tek yerden geliyor (credential_charset.py,
        # varsayilan UTF-8 -- eskisiyle bayt bayt ayni) ki `.conn_adt`'taki
        # ADT_SAP_PW_CHARSET satiri motorun HER iki auth yoluna da islesin.
        return {
            'Authorization': f'Basic {encode_basic_credentials(self._username, self._password)}'
        }

    def refresh_credentials(self) -> None:
        """
        Refresh credentials (no-op for Basic Auth).

        Basic Auth credentials don't expire, so this is a no-op.
        """
        pass

    def is_valid(self) -> bool:
        """
        Check if credentials are valid.

        Returns:
            True if username and password are set
        """
        return bool(self._username and self._password)

    @property
    def auth_type(self) -> str:
        """Return auth type identifier."""
        return 'basic'

    @property
    def username(self) -> str:
        """Get username."""
        return self._username

    @property
    def password(self) -> str:
        """Get password."""
        return self._password

    @property
    def client(self) -> str:
        """Get SAP client."""
        return self._client

    def update_credentials(self, username: str = None, password: str = None) -> None:
        """
        Update credentials.

        Args:
            username: New username (optional)
            password: New password (optional)
        """
        if username is not None:
            self._username = username
        if password is not None:
            self._password = password
